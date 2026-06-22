import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/** Keep in sync with gospel-admin/src/lib/backup/reimportableCorpusProfileSlug.ts */
function isReimportableCorpusProfileSlug(slug: string): boolean {
  const s = slug.trim();
  return (
    /^sg\d+$/i.test(s) ||
    /^me\d{4}$/i.test(s) ||
    /^cv([a-z0-9]+)$/i.test(s) ||
    /^mh([a-z0-9]+)$/i.test(s) ||
    /^je\d+$/i.test(s) ||
    /^lgal$/i.test(s) ||
    /^ltbw$/i.test(s) ||
    /^luthergal$/i.test(s) ||
    /^ppgr$/i.test(s) ||
    /^aogr$/i.test(s) ||
    /^bxrp$/i.test(s) ||
    /^jryh$/i.test(s) ||
    /^pkag$/i.test(s) ||
    /^jrym$/i.test(s) ||
    /^je(fow|rea|tog)$/i.test(s) ||
    /^lbst$/i.test(s) ||
    /^chst[123]$/i.test(s) ||
    /^tw(cm|bt|bd|dc|lp|tc)$/i.test(s)
  );
}

/**
 * Supabase Edge: after returning `Response`, the runtime may stop the isolate unless
 * outbound work is registered with `waitUntil`. Required for self-POST backup continuations.
 */
declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void } | undefined;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_KEEP_DAILY = 7;
/** Retention for `differential/YYYY-MM-DD/` calendar folders (newest N dates kept). */
const DEFAULT_KEEP_DIFFERENTIAL = 7;
const DEFAULT_MAX_BYTES = 50 * 1024 * 1024; // 50MB
/** Rows per PostgREST `.range()` page — larger = fewer DB round trips (helps finish under ~150s Edge wall clock). */
const DEFAULT_FETCH_RANGE_ROWS = 500;
const MAX_FETCH_RANGE_ROWS = 1000;
/** Rows merged into each gzip shard — keep low to avoid WORKER_RESOURCE_LIMIT and Edge **CPU time** kills on huge JSON. */
const DEFAULT_SHARD_MAX_ROWS = 4;
/** Flush shard when summed row JSON UTF-8 size reaches this. */
const DEFAULT_SHARD_APPROX_UTF8_BYTES = 120_000;
/** Storage PUT retries (Gateway Timeout / 5xx). */
const DEFAULT_STORAGE_UPLOAD_MAX_ATTEMPTS = 5;
const DEFAULT_STORAGE_RETRY_BASE_MS = 400;
/**
 * Max wall time per Edge invocation; then save checkpoint + chain another POST (stays under CPU/mem caps).
 * Override with BACKUP_SLICE_MS (e.g. 35000).
 */
const DEFAULT_SLICE_MS = 45_000;
/** Encode JSON in slices when piping to gzip to reduce peak allocator pressure vs single Blob(string). */
const GZIP_SOURCE_CHUNK_UTF16 = 256 * 1024;
/** Soft deadline disabled unless `BACKUP_SOFT_DEADLINE_MS` is set (suggested opt-in: `130000`). */
const BUCKET = "db-backups";
/** Multipart gz shards under `tables/<name>/part-NNNN.json.gz` (not one PUT per row — avoids 150s timeouts). */
const CHUNKED_FORMAT = "supabase_storage_chunked_v1";
const MANIFEST_VERSION = "4";
const ROW_LAYOUT_MULTIPART = "multipart_gz_shards";
const CHECKPOINT_VERSION = 1;
const CP_PREFIX = "checkpoints";

interface BackupCheckpointV1 {
  v: typeof CHECKPOINT_VERSION;
  run_id: string;
  run_prefix: string;
  iso_date: string;
  tables_to_backup: string[];
  table_idx: number;
  /** Finished tables → object paths */
  table_paths: Record<string, string[]>;
  table_stats: Record<string, number>;
  row_count_total: number;
  total_compressed_bytes: number;
  warnings: string[];
  table_hash: string;
  new_tables: string[];
  missing_tables: string[];
  /** While inside `profiles` — merged across slices */
  profiles_slug_by_slug: Record<string, string>;
  /** Resume inside current table (buffer is always flushed before checkpoint) */
  resume_range_from: number;
  resume_shard_index: number;
  /** Rows already written for `tables_to_backup[table_idx]` in prior slices */
  partial_table_rows: number;
  run_started_at_iso: string;
  /** Differential backup continuation (optional for legacy checkpoints). */
  backup_kind?: "full" | "differential";
  differential_since_iso?: string | null;
  base_full_run_id?: string | null;
  storage_prefix_kind?: "daily" | "differential";
  /** Profile UUIDs omitted from backup (CCEL corpora — re-import from npm scripts). */
  corpus_profile_ids?: string[];
}

interface BackupRunRow {
  id: string;
  table_names: string[] | null;
}

type ServiceClient = ReturnType<typeof createClient>;

interface BackupRequestBody {
  resume_run_id?: string;
  /** Omit or `"full"` = complete export; `"differential"` = rows with `updated_at` >= last full completion. */
  mode?: string;
}

function envInt(name: string, fallback: number): number {
  const raw = Deno.env.get(name);
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Set a positive ms value to abort before ~150s hard kill; unset or `0` = disabled. */
function optionalPositiveMs(name: string): number | null {
  const raw = Deno.env.get(name);
  if (raw === undefined || raw === "" || raw === "0") return null;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Transient Storage / edge network errors worth retrying before failing the run. */
function isTransientStorageError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    /gateway timeout|504|502|503|408|timeout|timed out|econnreset|etimedout|network error|fetch failed|temporarily unavailable|bad gateway|service unavailable|429|rate limit/.test(
      m
    )
  );
}

async function storageUploadWithRetry(
  supabase: StorageUploader,
  objectPath: string,
  body: Uint8Array,
  contentType: string
): Promise<void> {
  const maxAttempts = Math.max(1, envInt("BACKUP_STORAGE_UPLOAD_MAX_ATTEMPTS", DEFAULT_STORAGE_UPLOAD_MAX_ATTEMPTS));
  const baseDelayMs = Math.max(50, envInt("BACKUP_STORAGE_RETRY_BASE_MS", DEFAULT_STORAGE_RETRY_BASE_MS));
  let lastMsg = "";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { error } = await supabase.storage.from(BUCKET).upload(objectPath, body, {
      contentType,
      upsert: true,
    });
    if (!error) return;
    lastMsg = error.message;
    const retryable = attempt < maxAttempts && isTransientStorageError(lastMsg);
    if (retryable) {
      const backoff = Math.min(10_000, baseDelayMs * 2 ** (attempt - 1));
      const jitter = Math.floor(Math.random() * 150);
      const waitMs = backoff + jitter;
      console.warn(
        JSON.stringify({
          event: "storage_upload_retry",
          objectPath,
          attempt,
          maxAttempts,
          error: lastMsg,
          waitMs,
        })
      );
      await sleep(waitMs);
      continue;
    }
    throw new Error(`Storage upload failed (${objectPath}): ${lastMsg}`);
  }
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function gzipText(input: string): Promise<Uint8Array> {
  const te = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let offset = 0; offset < input.length; offset += GZIP_SOURCE_CHUNK_UTF16) {
        controller.enqueue(te.encode(input.slice(offset, offset + GZIP_SOURCE_CHUNK_UTF16)));
      }
      controller.close();
    },
  }).pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function jsonReplacerForBackup(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  return value;
}

/** Rows from PostgREST can include bigint values; plain JSON.stringify throws on bigint. */
function jsonStringifyForBackup(value: unknown): string {
  try {
    return JSON.stringify(value, jsonReplacerForBackup);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`JSON stringify failed (${detail}); check for circular structures or unsupported types in table data`);
  }
}

function stringifyShardRow(tableName: string, row: unknown): string {
  try {
    return jsonStringifyForBackup(row);
  } catch (err) {
    const keys =
      row && typeof row === "object" && row !== null
        ? Object.keys(row as Record<string, unknown>).slice(0, 16).join(",")
        : "";
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`${tableName}: failed to serialize a row (${keys || "unknown shape"}): ${detail}`);
  }
}

type StorageUploader = {
  storage: {
    from: (_bucket: string) => {
      upload: (
        path: string,
        body: Uint8Array,
        opts?: { contentType?: string; upsert?: boolean }
      ) => Promise<{ error: { message: string } | null }>;
    };
  };
};

function checkpointObjectPath(runId: string): string {
  return `${CP_PREFIX}/${runId}.json`;
}

async function saveCheckpoint(
  supabase: StorageUploader,
  cp: BackupCheckpointV1
): Promise<void> {
  const path = checkpointObjectPath(cp.run_id);
  const body = new TextEncoder().encode(JSON.stringify(cp));
  await storageUploadWithRetry(supabase, path, body, "application/json");
}

async function loadCheckpoint(
  supabase: ServiceClient,
  runId: string
): Promise<BackupCheckpointV1 | null> {
  const path = checkpointObjectPath(runId);
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) return null;
  const text = await data.text();
  const parsed = JSON.parse(text) as BackupCheckpointV1;
  if (parsed.v !== CHECKPOINT_VERSION || typeof parsed.run_prefix !== "string") return null;
  return parsed;
}

async function deleteCheckpoint(supabase: StorageUploader, runId: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([checkpointObjectPath(runId)]);
}

type TableBackupOutcome =
  | {
      kind: "done";
      paths: string[];
      rowCount: number;
      bytes: number;
      profilesSlugBySlug: Record<string, string>;
    }
  | {
      kind: "slice";
      paths: string[];
      rowCount: number;
      bytes: number;
      profilesSlugBySlug: Record<string, string>;
      resumeRangeFrom: number;
      resumeShardIndex: number;
    };

type TableBackupFilter =
  | { kind: "full" }
  | { kind: "differential"; sinceIso: string };

/** Profile ids for CCEL corpora excluded from `profiles` and `spurgeon_passage_index` shards. */
async function fetchCorpusProfileIds(supabase: ServiceClient): Promise<Set<string>> {
  const ids = new Set<string>();
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase.from("profiles").select("id, slug").range(from, from + pageSize - 1);
    if (error) throw new Error(`profiles corpus scan: ${error.message}`);
    const rows = data ?? [];
    for (const row of rows) {
      const rec = row as { id?: string; slug?: string };
      if (
        typeof rec.id === "string" &&
        typeof rec.slug === "string" &&
        isReimportableCorpusProfileSlug(rec.slug)
      ) {
        ids.add(rec.id);
      }
    }
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return ids;
}

/** Stable pagination order; some tables have no `id` or use composite PKs. */
function orderColumnForBackupTable(tableName: string): string {
  if (tableName === "translation_settings") return "translation_code";
  if (tableName === "sync_key_entries") return "updated_at";
  return "id";
}

/** One table, possibly resuming; stops between PostgREST pages after flush when `sliceDeadlineMs` is hit. */
async function backupOneTableWithSlice(
  supabase: ServiceClient,
  tableName: string,
  runPrefix: string,
  fetchChunk: number,
  shardMaxRows: number,
  shardMaxApproxUtf8: number,
  maxBytes: number,
  runWarnings: string[],
  checkDeadline: () => void,
  start: { rangeFrom: number; shardIndex: number; paths: string[]; slugMap: Record<string, string> },
  sliceDeadlineMs: number,
  tableFilter: TableBackupFilter,
  corpusProfileIds: Set<string>
): Promise<TableBackupOutcome> {
  const paths = [...start.paths];
  let rowCount = 0;
  let bytesAccum = 0;
  let buffer: string[] = [];
  let bufferApproxUtf8 = 0;
  let rangeFrom = start.rangeFrom;
  let shardIndex = start.shardIndex;
  const enc = new TextEncoder();
  const slugByProfileSlug: Record<string, string> = { ...start.slugMap };

  const flush = async (): Promise<void> => {
    if (buffer.length === 0) return;
    let payload: string;
    try {
      const head =
        `{"table":${JSON.stringify(tableName)},"shard_index":${shardIndex},"rows":[`;
      const tail = "]}";
      payload = head + buffer.join(",") + tail;
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(`${tableName}: shard ${shardIndex} JSON failed (${detail})`);
    }
    const gz = await gzipText(payload);
    if (gz.byteLength > maxBytes) {
      runWarnings.push(
        `Table "${tableName}" shard ${shardIndex} compressed ${gz.byteLength} bytes (>${maxBytes}). Lower BACKUP_SHARD_APPROX_UTF8_BYTES or BACKUP_TABLE_SHARD_MAX_ROWS.`
      );
    }
    const objectPath = `${runPrefix}/tables/${tableName}/part-${String(shardIndex).padStart(4, "0")}.json.gz`;
    await storageUploadWithRetry(supabase, objectPath, gz, "application/gzip");
    paths.push(objectPath);
    bytesAccum += gz.byteLength;
    shardIndex += 1;
    buffer = [];
    bufferApproxUtf8 = 0;
  };

  for (;;) {
    checkDeadline();
    let query = supabase.from(tableName).select("*");
    if (tableFilter.kind === "differential") {
      query = query.gte("updated_at", tableFilter.sinceIso);
    }
    const orderCol = orderColumnForBackupTable(tableName);
    const { data, error } = await query.order(orderCol, { ascending: true }).range(rangeFrom, rangeFrom + fetchChunk - 1);
    if (error) throw new Error(`${tableName}: ${error.message}`);
    const rows = data ?? [];

    for (const row of rows) {
      const rec = row as Record<string, unknown>;
      if (tableName === "profiles") {
        const sid = rec.id;
        if (typeof sid === "string" && corpusProfileIds.has(sid)) continue;
      }
      if (tableName === "spurgeon_passage_index") {
        const pid = rec.profile_id;
        if (typeof pid === "string" && corpusProfileIds.has(pid)) continue;
      }
      const rowJson = stringifyShardRow(tableName, row);
      const rowUtf8 = enc.encode(rowJson).byteLength;
      if (rowUtf8 >= shardMaxApproxUtf8) {
        runWarnings.push(
          `Table "${tableName}" has a row ~${rowUtf8} UTF-8 bytes (>= BACKUP_SHARD_APPROX_UTF8_BYTES). That row may fill a shard alone.`
        );
      }
      if (tableName === "profiles") {
        const sid = rec.id;
        const slug = rec.slug;
        if (typeof sid === "string" && typeof slug === "string" && slug.length > 0) {
          slugByProfileSlug[slug] = sid;
        }
      }
      buffer.push(rowJson);
      bufferApproxUtf8 += rowUtf8 + 2;
      rowCount += 1;
      const overRows = buffer.length >= shardMaxRows;
      const overBytes = buffer.length > 0 && bufferApproxUtf8 >= shardMaxApproxUtf8;
      if (overRows || overBytes) await flush();
    }

    rangeFrom += rows.length;
    await flush();

    if (Date.now() >= sliceDeadlineMs) {
      return {
        kind: "slice",
        paths,
        rowCount,
        bytes: bytesAccum,
        profilesSlugBySlug: slugByProfileSlug,
        resumeRangeFrom: rangeFrom,
        resumeShardIndex: shardIndex,
      };
    }

    if (rows.length < fetchChunk) break;
  }

  if (tableName === "profiles" && Object.keys(slugByProfileSlug).length > 0) {
    const idxPath = `${runPrefix}/tables/profiles/_slug_index.json`;
    const idxBody = new TextEncoder().encode(JSON.stringify({ by_slug: slugByProfileSlug }, null, 0));
    try {
      await storageUploadWithRetry(supabase, idxPath, idxBody, "application/json");
      bytesAccum += idxBody.byteLength;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      runWarnings.push(`Could not upload profiles slug index (${idxPath}): ${msg}`);
    }
  }

  return {
    kind: "done",
    paths,
    rowCount,
    bytes: bytesAccum,
    profilesSlugBySlug: slugByProfileSlug,
  };
}

function scheduleContinuation(supabaseUrl: string, serviceRole: string, runId: string): void {
  const continuation = fetch(`${supabaseUrl}/functions/v1/backup-to-storage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRole}`,
      apikey: serviceRole,
    },
    body: JSON.stringify({ resume_run_id: runId }),
  })
    .then(async (res) => {
      const text = await res.text();
      if (!res.ok) {
        console.error(
          JSON.stringify({
            event: "backup_continuation_http_error",
            runId,
            status: res.status,
            body: text.slice(0, 2000),
          })
        );
        return;
      }
      try {
        const json = JSON.parse(text) as { continuing?: boolean; success?: boolean; tableName?: string };
        console.log(
          JSON.stringify({
            event: "backup_continuation_response",
            runId,
            continuing: Boolean(json.continuing),
            success: Boolean(json.success),
            tableName: json.tableName,
          })
        );
      } catch {
        console.log(JSON.stringify({ event: "backup_continuation_response", runId, nonJson: text.slice(0, 400) }));
      }
    })
    .catch((e) => console.error("backup continuation fetch failed:", e));

  if (typeof EdgeRuntime !== "undefined" && typeof EdgeRuntime.waitUntil === "function") {
    EdgeRuntime.waitUntil(continuation);
  } else {
    console.warn(
      "EdgeRuntime.waitUntil is not available; continuation may not run after the HTTP response is sent. " +
        "Deploy to current Supabase Edge, or trigger resume manually (POST body {\"resume_run_id\":\"…\"})."
    );
    void continuation;
  }
}

function diffTables(current: string[], previous: string[]) {
  const prevSet = new Set(previous);
  const curSet = new Set(current);
  const newTables = current.filter((t) => !prevSet.has(t));
  const missingTables = previous.filter((t) => !curSet.has(t));
  return { newTables, missingTables };
}

type StorageObjectsClient = ReturnType<typeof createClient>;

/** Child names under `daily/` or `differential/` whose names look like `YYYY-MM-DD` (calendar folders). */
async function listCalendarFolderDates(supabase: StorageObjectsClient, rootFolder: string): Promise<string[]> {
  const dates: string[] = [];
  let offset = 0;
  for (;;) {
    const { data: items, error } = await supabase.storage.from(BUCKET).list(rootFolder, {
      limit: 1000,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`storage.list(${rootFolder}): ${error.message}`);
    if (!items?.length) break;
    for (const it of items) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(it.name)) dates.push(it.name);
    }
    if (items.length < 1000) break;
    offset += 1000;
  }
  return dates;
}

/** All file object paths under a prefix (BFS). `id === null` entries are treated as folders (Supabase Storage). */
async function listStorageFilePathsUnderPrefix(
  supabase: StorageObjectsClient,
  rootPrefix: string
): Promise<string[]> {
  const files: string[] = [];
  const queue: string[] = [rootPrefix.replace(/\/+$/, "")];

  while (queue.length > 0) {
    const dir = queue.shift()!;
    let off = 0;
    for (;;) {
      const { data: items, error } = await supabase.storage.from(BUCKET).list(dir, {
        limit: 1000,
        offset: off,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw new Error(`storage.list(${dir}): ${error.message}`);
      if (!items?.length) break;
      for (const it of items) {
        const fullPath = `${dir}/${it.name}`;
        if (it.id == null) queue.push(fullPath);
        else files.push(fullPath);
      }
      if (items.length < 1000) break;
      off += 1000;
    }
  }
  return files;
}

/** When PostgREST cannot query `storage.objects` (only `public` / `graphql_public` exposed), prune via Storage list + remove. */
async function pruneBackupCalendarPrefixesViaStorageList(
  supabase: StorageObjectsClient,
  rootFolder: "daily" | "differential",
  keepCount: number,
  runWarnings: string[]
): Promise<void> {
  const folderDates = await listCalendarFolderDates(supabase, rootFolder);
  const sorted = [...new Set(folderDates)].sort().reverse();
  const obsolete = sorted.slice(keepCount);
  if (obsolete.length === 0) return;

  const chunkSize = 100;
  for (const date of obsolete) {
    const root = `${rootFolder}/${date}`;
    let names: string[];
    try {
      names = await listStorageFilePathsUnderPrefix(supabase, root);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      runWarnings.push(`Retention list failed for ${root}: ${msg}`);
      continue;
    }
    for (let i = 0; i < names.length; i += chunkSize) {
      const slice = names.slice(i, i + chunkSize);
      const { error: delErr } = await supabase.storage.from(BUCKET).remove(slice);
      if (delErr) runWarnings.push(`Retention pruning error (${root}): ${delErr.message}`);
    }
  }
}

/**
 * Keep newest `keepCount` calendar date folders under `{rootFolder}/YYYY-MM-DD/` (including all `/<run_id>/` objects);
 * deletes entire older date prefixes.
 */
async function pruneBackupCalendarPrefixes(
  supabase: StorageObjectsClient,
  rootFolder: "daily" | "differential",
  keepCount: number,
  runWarnings: string[]
): Promise<void> {
  const likePattern = `${rootFolder}/%`;
  const { data: objects, error: objErr } = await supabase
    .schema("storage")
    .from("objects")
    .select("name")
    .eq("bucket_id", BUCKET)
    .like("name", likePattern);

  if (!objErr) {
    const folderRe = new RegExp(`^${rootFolder}/([^/]+)/`);
    const dates = new Set<string>();
    for (const row of (objects ?? []) as { name: string }[]) {
      const m = folderRe.exec(row.name);
      if (m) dates.add(m[1]);
    }
    const sorted = [...dates].sort().reverse();
    const obsolete = sorted.slice(keepCount);
    if (obsolete.length === 0) return;

    const chunkSize = 100;
    for (const date of obsolete) {
      const prefix = `${rootFolder}/${date}/`;
      const { data: dayObjs, error: dayErr } = await supabase
        .schema("storage")
        .from("objects")
        .select("name")
        .eq("bucket_id", BUCKET)
        .like("name", `${prefix}%`);
      if (dayErr) {
        runWarnings.push(`Retention list failed for prefix ${prefix}: ${dayErr.message}`);
        continue;
      }
      const names = ((dayObjs ?? []) as { name: string }[]).map((r) => r.name);
      for (let i = 0; i < names.length; i += chunkSize) {
        const slice = names.slice(i, i + chunkSize);
        const { error: delErr } = await supabase.storage.from(BUCKET).remove(slice);
        if (delErr) runWarnings.push(`Retention pruning error (${prefix}): ${delErr.message}`);
      }
    }
    return;
  }

  const reason = objErr?.message ?? "storage.objects query returned no data";
  console.warn(
    JSON.stringify({
      event: "backup_prune_using_storage_list_fallback",
      rootFolder,
      reason,
      hint: "PostgREST often exposes only public/graphql_public; retention still runs via Storage API.",
    })
  );
  try {
    await pruneBackupCalendarPrefixesViaStorageList(supabase, rootFolder, keepCount, runWarnings);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    runWarnings.push(
      `Could not prune old ${rootFolder} backups (objects API: ${reason}; list fallback: ${msg})`
    );
  }
}

async function sendAlertEmail(recipients: string[], subject: string, body: string) {
  if (recipients.length === 0) return;
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) return;

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRole}`,
      },
      body: JSON.stringify({
        bcc: recipients,
        subject,
        body,
        isHtml: false,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Failed sending alert email:", text);
    }
  } catch (e) {
    console.error("sendAlertEmail fetch threw:", e);
  }
}

function sumTableStats(stats: Record<string, number>): number {
  let s = 0;
  for (const v of Object.values(stats)) s += v;
  return s;
}

/** Last successful full backup row — used as differential watermark (`updated_at` filter floor). */
async function fetchLastFullBackupWatermark(
  supabase: ServiceClient
): Promise<{ id: string; run_completed_at: string } | null> {
  const { data, error } = await supabase
    .from("backup_runs")
    .select("id, run_completed_at")
    .eq("backup_kind", "full")
    .in("status", ["success", "warning"])
    .not("run_completed_at", "is", null)
    .order("run_completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn(JSON.stringify({ event: "fetchLastFullBackupWatermark_error", message: error.message }));
    return null;
  }
  if (!data?.run_completed_at || typeof data.id !== "string") return null;
  return { id: data.id, run_completed_at: data.run_completed_at };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) {
    return new Response(JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const keepDaily = envInt("BACKUP_KEEP_DAILY", DEFAULT_KEEP_DAILY);
  const keepDifferential = envInt("BACKUP_KEEP_DIFFERENTIAL_DAYS", DEFAULT_KEEP_DIFFERENTIAL);
  const maxBytes = envInt("BACKUP_MAX_BYTES", DEFAULT_MAX_BYTES);
  const shardMaxRows = envInt("BACKUP_TABLE_SHARD_MAX_ROWS", DEFAULT_SHARD_MAX_ROWS);
  const shardMaxApproxUtf8 = envInt("BACKUP_SHARD_APPROX_UTF8_BYTES", DEFAULT_SHARD_APPROX_UTF8_BYTES);
  const fetchChunk = Math.min(
    MAX_FETCH_RANGE_ROWS,
    Math.max(1, envInt("BACKUP_FETCH_RANGE_ROWS", DEFAULT_FETCH_RANGE_ROWS))
  );
  const sliceMs = envInt("BACKUP_SLICE_MS", DEFAULT_SLICE_MS);
  const softDeadlineMs = optionalPositiveMs("BACKUP_SOFT_DEADLINE_MS");
  const supabase = createClient(supabaseUrl, serviceRole);
  const sliceDeadlineMs = Date.now() + sliceMs;

  let body: BackupRequestBody = {};
  try {
    body = (await req.json()) as BackupRequestBody;
  } catch {
    /* empty POST body from pg_net */
  }
  const resumeRunId = typeof body.resume_run_id === "string" ? body.resume_run_id.trim() : "";

  const runStart = Date.now();
  const checkDeadline = () => {
    if (softDeadlineMs === null) return;
    if (Date.now() - runStart > softDeadlineMs) {
      throw new Error(
        `Backup exceeded soft deadline ${softDeadlineMs}ms (Edge workers ~150s wall clock). ` +
          `Raise BACKUP_FETCH_RANGE_ROWS (max ${MAX_FETCH_RANGE_ROWS}), unset BACKUP_SOFT_DEADLINE_MS, ` +
          `or reduce tables exported by get_backup_tables() / omit huge tables.`
      );
    }
  };

  let runId = "";
  let backupKind: "full" | "differential" = "full";
  let differentialSinceIso: string | null = null;
  let baseFullRunId: string | null = null;
  const runWarnings: string[] = [];
  let preloadedCp: BackupCheckpointV1 | null = null;

  if (resumeRunId) {
    preloadedCp = await loadCheckpoint(supabase, resumeRunId);
    if (!preloadedCp) {
      return new Response(
        JSON.stringify({ error: `No checkpoint found for resume_run_id=${resumeRunId}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    runId = preloadedCp.run_id;
    runWarnings.push(...preloadedCp.warnings);
    backupKind = preloadedCp.backup_kind ?? "full";
    differentialSinceIso = preloadedCp.differential_since_iso ?? null;
    baseFullRunId = preloadedCp.base_full_run_id ?? null;
  } else {
    backupKind = body.mode === "differential" ? "differential" : "full";
    if (backupKind === "differential") {
      const wm = await fetchLastFullBackupWatermark(supabase);
      if (!wm?.run_completed_at) {
        return new Response(
          JSON.stringify({
            error:
              "No successful full backup found (backup_kind=full, status success|warning). Run a full backup before differential.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      differentialSinceIso = wm.run_completed_at;
      baseFullRunId = wm.id;
    }
    const runStartedAt = new Date().toISOString();
    const { data: runInsert, error: runInsertError } = await supabase
      .from("backup_runs")
      .insert({
        status: "running",
        run_started_at: runStartedAt,
        warnings: [],
        backup_kind: backupKind,
        incremental_base_completed_at: differentialSinceIso,
      })
      .select("id")
      .single();

    if (runInsertError || !runInsert?.id) {
      return new Response(JSON.stringify({ error: `Failed to create backup run: ${runInsertError?.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    runId = runInsert.id as string;
  }

  try {
    let tablesToBackup: string[] = [];
    let isoDate = "";
    let runPrefix = "";
    let tableHash = "";
    let newTables: string[] = [];
    let missingTables: string[] = [];
    let tableStats: Record<string, number> = {};
    let tablePaths: Record<string, string[]> = {};
    let totalCompressedBytes = 0;
    let partialTableRows = 0;
    let profilesSlugBySlug: Record<string, string> = {};
    let tableIdx = 0;
    const runStartedAtIso = preloadedCp?.run_started_at_iso ?? new Date().toISOString();

    if (preloadedCp) {
      tablesToBackup = preloadedCp.tables_to_backup;
      isoDate = preloadedCp.iso_date;
      runPrefix = preloadedCp.run_prefix;
      tableHash = preloadedCp.table_hash;
      newTables = preloadedCp.new_tables;
      missingTables = preloadedCp.missing_tables;
      tableStats = { ...preloadedCp.table_stats };
      tablePaths = { ...preloadedCp.table_paths };
      totalCompressedBytes = preloadedCp.total_compressed_bytes;
      partialTableRows = preloadedCp.partial_table_rows;
      profilesSlugBySlug = { ...preloadedCp.profiles_slug_by_slug };
      tableIdx = preloadedCp.table_idx;
    } else {
      const { data: rpcRows, error: rpcError } = await supabase.rpc("get_backup_tables");
      if (rpcError || !rpcRows?.length) {
        tablesToBackup = [
          "admin_settings",
          "coma_templates",
          "profiles",
          "translation_settings",
          "user_profiles",
        ];
        runWarnings.push("Using fallback table list because get_backup_tables() was unavailable.");
      } else {
        tablesToBackup = rpcRows.map((r: { table_name: string }) => r.table_name);
      }

      const now = new Date();
      isoDate = now.toISOString().split("T")[0];
      const prefixFolder = backupKind === "differential" ? "differential" : "daily";
      runPrefix = `${prefixFolder}/${isoDate}/${runId}`;
      tableHash = await sha256Hex(tablesToBackup.join("|"));
      const { data: previousRun } = await supabase
        .from("backup_runs")
        .select("id, table_names")
        .in("status", ["success", "warning"])
        .neq("id", runId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const prevTables = ((previousRun as BackupRunRow | null)?.table_names ?? []) as string[];
      const diff = diffTables(tablesToBackup, prevTables);
      newTables = diff.newTables;
      missingTables = diff.missingTables;
      if (newTables.length > 0) runWarnings.push(`New tables discovered: ${newTables.join(", ")}`);
      if (missingTables.length > 0) runWarnings.push(`Missing previously discovered tables: ${missingTables.join(", ")}`);
    }

    const tableFilter: TableBackupFilter =
      backupKind === "differential" && differentialSinceIso
        ? { kind: "differential", sinceIso: differentialSinceIso }
        : { kind: "full" };

    if (backupKind === "differential" && !differentialSinceIso) {
      throw new Error("Differential backup missing watermark (incremental_base_completed_at); cannot continue.");
    }

    let corpusProfileIds: Set<string>;
    if (preloadedCp?.corpus_profile_ids?.length) {
      corpusProfileIds = new Set(preloadedCp.corpus_profile_ids);
    } else {
      corpusProfileIds = await fetchCorpusProfileIds(supabase);
      runWarnings.push(
        `Excluded ${corpusProfileIds.size} re-importable CCEL corpus profile(s) from profiles and spurgeon_passage_index.`
      );
    }

    while (tableIdx < tablesToBackup.length) {
      checkDeadline();
      const tableName = tablesToBackup[tableIdx];
      const useResume = !!(preloadedCp && tableIdx === preloadedCp.table_idx);

      const start = {
        rangeFrom: useResume ? preloadedCp!.resume_range_from : 0,
        shardIndex: useResume ? preloadedCp!.resume_shard_index : 0,
        paths: tablePaths[tableName] ?? [],
        slugMap: tableName === "profiles" ? profilesSlugBySlug : {},
      };

      const outcome = await backupOneTableWithSlice(
        supabase,
        tableName,
        runPrefix,
        fetchChunk,
        shardMaxRows,
        shardMaxApproxUtf8,
        maxBytes,
        runWarnings,
        checkDeadline,
        start,
        sliceDeadlineMs,
        tableFilter,
        corpusProfileIds
      );

      totalCompressedBytes += outcome.bytes;

      if (outcome.kind === "slice") {
        partialTableRows += outcome.rowCount;
        tablePaths[tableName] = outcome.paths;
        if (tableName === "profiles") profilesSlugBySlug = { ...outcome.profilesSlugBySlug };
        const rowCountTotal = sumTableStats(tableStats) + partialTableRows;

        const cp: BackupCheckpointV1 = {
          v: CHECKPOINT_VERSION,
          run_id: runId,
          run_prefix: runPrefix,
          iso_date: isoDate,
          tables_to_backup: tablesToBackup,
          table_idx: tableIdx,
          table_paths: { ...tablePaths },
          table_stats: { ...tableStats },
          row_count_total: rowCountTotal,
          total_compressed_bytes: totalCompressedBytes,
          warnings: [...runWarnings],
          table_hash: tableHash,
          new_tables: newTables,
          missing_tables: missingTables,
          profiles_slug_by_slug: { ...profilesSlugBySlug },
          resume_range_from: outcome.resumeRangeFrom,
          resume_shard_index: outcome.resumeShardIndex,
          partial_table_rows: partialTableRows,
          run_started_at_iso: runStartedAtIso,
          backup_kind: backupKind,
          differential_since_iso: differentialSinceIso,
          base_full_run_id: baseFullRunId,
          storage_prefix_kind: backupKind === "differential" ? "differential" : "daily",
          corpus_profile_ids: Array.from(corpusProfileIds),
        };
        await saveCheckpoint(supabase as StorageUploader, cp);
        const { error: partialErr } = await supabase
          .from("backup_runs")
          .update({
            status: "partial",
            warnings: runWarnings,
            backup_bytes: totalCompressedBytes,
            row_count_total: rowCountTotal,
            table_names: tablesToBackup,
          })
          .eq("id", runId);
        if (partialErr) {
          const hint =
            /check constraint|violates check constraint|23514/i.test(partialErr.message ?? "")
              ? " Apply sql/migrations/20260508_backup_runs_checkpoint_status.sql so status 'partial' is allowed."
              : "";
          runWarnings.push(`Could not set backup_runs status to partial: ${partialErr.message}.${hint}`);
          const { error: runningErr } = await supabase
            .from("backup_runs")
            .update({
              status: "running",
              warnings: runWarnings,
              backup_bytes: totalCompressedBytes,
              row_count_total: rowCountTotal,
              table_names: tablesToBackup,
            })
            .eq("id", runId);
          if (runningErr) {
            console.error("backup_runs update (running fallback) failed:", runningErr);
          }
        }

        scheduleContinuation(supabaseUrl, serviceRole, runId);
        console.log(JSON.stringify({ event: "backup_to_storage_continuing", runId, tableName, tableIdx }));

        return new Response(
          JSON.stringify({
            success: true,
            continuing: true,
            runId,
            checkpoint: "saved",
            resumeHint: { resume_run_id: runId },
            tableName,
            sliceMs,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const finalRows = partialTableRows + outcome.rowCount;
      tableStats[tableName] = finalRows;
      tablePaths[tableName] = outcome.paths;
      partialTableRows = 0;
      if (tableName === "profiles") profilesSlugBySlug = { ...outcome.profilesSlugBySlug };
      tableIdx += 1;
    }

    const rowCountTotal = sumTableStats(tableStats);
    const now = new Date();

    const manifest = {
      backup_format: CHUNKED_FORMAT,
      manifest_version: MANIFEST_VERSION,
      backup_date: now.toISOString(),
      backup_type: "supabase_storage_automated",
      backup_version: "4.2",
      run_id: runId,
      run_prefix: runPrefix,
      tables: tablePaths,
      metadata: {
        row_layout: ROW_LAYOUT_MULTIPART,
        backup_chained_slices: true,
        table_count: tablesToBackup.length,
        row_count_total: rowCountTotal,
        table_stats: tableStats,
        table_hash: tableHash,
        new_tables: newTables,
        missing_tables: missingTables,
        backup_kind: backupKind,
        differential_since: differentialSinceIso,
        base_full_run_id: baseFullRunId,
        excluded_reimportable_corpus: true,
        corpus_profile_count_excluded: corpusProfileIds.size,
      },
    };

    const manifestJson = JSON.stringify(manifest);
    const manifestPath = `${runPrefix}/manifest.json`;
    const manifestBytes = new TextEncoder().encode(manifestJson);

    await storageUploadWithRetry(supabase as StorageUploader, manifestPath, manifestBytes, "application/json");
    totalCompressedBytes += manifestBytes.byteLength;

    if (totalCompressedBytes > maxBytes) {
      runWarnings.push(
        `Total artifact size ${totalCompressedBytes} exceeds threshold ${maxBytes}. Backup stored but review retention/scope.`
      );
    }

    const dailyPath = manifestPath;

    const latestPointer = JSON.stringify({
      format: "chunked_v1",
      manifest_path: manifestPath,
      run_id: runId,
      updated_at: now.toISOString(),
      compressed_bytes_total: totalCompressedBytes,
      table_count: tablesToBackup.length,
      backup_kind: backupKind,
    });
    try {
      if (backupKind === "full") {
        await storageUploadWithRetry(
          supabase as StorageUploader,
          "latest/latest-backup.json",
          new TextEncoder().encode(latestPointer),
          "application/json"
        );
      } else {
        await storageUploadWithRetry(
          supabase as StorageUploader,
          "latest/latest-differential-backup.json",
          new TextEncoder().encode(latestPointer),
          "application/json"
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      runWarnings.push(`Could not update latest ${backupKind} pointer: ${msg}`);
    }

    try {
      if (backupKind === "full") {
        await pruneBackupCalendarPrefixes(supabase, "daily", keepDaily, runWarnings);
      } else {
        await pruneBackupCalendarPrefixes(supabase, "differential", keepDifferential, runWarnings);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      runWarnings.push(`Retention pruning crashed (non-fatal): ${msg}`);
      console.error("pruneBackupCalendarPrefixes:", e);
    }

    // Find admin recipient emails by joining admin ids with auth users
    let uniqueRecipients: string[] = [];
    try {
      const { data: adminProfiles } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("role", "admin");
      const adminIds = (adminProfiles ?? []).map((r: { id: string }) => r.id);
      const recipients: string[] = [];
      if (adminIds.length > 0) {
        const pageSize = 200;
        let page = 1;
        for (;;) {
          const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: pageSize });
          if (error || !data?.users?.length) break;
          for (const user of data.users) {
            if (adminIds.includes(user.id) && user.email) recipients.push(user.email);
          }
          if (data.users.length < pageSize) break;
          page += 1;
        }
      }
      uniqueRecipients = Array.from(new Set(recipients)).filter((e) => e.includes("@"));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      runWarnings.push(`Could not list admin recipients (non-fatal): ${msg}`);
      console.error("admin recipient listing:", e);
    }

    const status = runWarnings.length > 0 ? "warning" : "success";
    const { error: updateErr } = await supabase
      .from("backup_runs")
      .update({
        status,
        run_completed_at: new Date().toISOString(),
        backup_path: dailyPath,
        backup_bytes: totalCompressedBytes,
        table_count: tablesToBackup.length,
        row_count_total: rowCountTotal,
        table_names: tablesToBackup,
        table_hash: tableHash,
        new_tables: newTables,
        missing_tables: missingTables,
        warnings: runWarnings,
        admin_recipients: uniqueRecipients,
      })
      .eq("id", runId);
    if (updateErr) {
      console.error("Failed to update backup run row:", updateErr);
    } else {
      try {
        await deleteCheckpoint(supabase as StorageUploader, runId);
      } catch (e) {
        console.error("deleteCheckpoint failed:", e);
      }
    }

    // Email only on hard failure (catch block); warnings stay in backup_runs / logs.

    console.log(
      JSON.stringify({
        event: "backup_to_storage_success",
        runId,
        backupKind,
        status,
        backupPath: dailyPath,
        artifactsBytesTotal: totalCompressedBytes,
        tableCount: tablesToBackup.length,
        rowCountTotal,
        warningCount: runWarnings.length,
      })
    );

    return new Response(
      JSON.stringify({
        success: true,
        runId,
        backupKind,
        status,
        backupPath: dailyPath,
        backupFormat: CHUNKED_FORMAT,
        artifactsBytesTotal: totalCompressedBytes,
        tableCount: tablesToBackup.length,
        rowCountTotal,
        warnings: runWarnings,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error && error.stack ? error.stack.slice(0, 2000) : undefined;
    console.error(
      JSON.stringify({
        event: "backup_to_storage_failed",
        runId,
        message,
        stack,
      })
    );

    // Try to alert admins even when failed (never throw out of this catch)
    let uniqueRecipients: string[] = [];
    try {
      const { data: adminProfiles } = await supabase.from("user_profiles").select("id").eq("role", "admin");
      const adminIds = (adminProfiles ?? []).map((r: { id: string }) => r.id);
      if (adminIds.length > 0) {
        const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const emails = (data?.users ?? [])
          .filter((u) => adminIds.includes(u.id) && !!u.email)
          .map((u) => u.email as string);
        uniqueRecipients = Array.from(new Set(emails));
      }
    } catch (e) {
      console.error("Failed collecting admin recipients:", e);
    }

    try {
      await supabase
        .from("backup_runs")
        .update({
          status: "failed",
          run_completed_at: new Date().toISOString(),
          warnings: runWarnings,
          error_message: message.slice(0, 8000),
          admin_recipients: uniqueRecipients,
        })
        .eq("id", runId);
    } catch (e) {
      console.error("Failed to persist backup_runs failure row:", e);
    }

    try {
      await sendAlertEmail(
        uniqueRecipients,
        `[Backup Failed] Supabase storage ${backupKind} backup failed`,
        [
          `Run ID: ${runId}`,
          `Backup kind: ${backupKind}`,
          "Status: failed",
          `Error: ${message}`,
          "",
          "Warnings before failure:",
          ...runWarnings.map((w) => `- ${w}`),
        ].join("\n")
      );
    } catch (e) {
      console.error("sendAlertEmail (failure) failed:", e);
    }

    return new Response(JSON.stringify({ error: message, runId }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
