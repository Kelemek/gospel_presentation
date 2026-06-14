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
    /^jrym$/i.test(s) ||
    /^je(fow|rea|tog)$/i.test(s) ||
    /^lbst$/i.test(s) ||
    /^tw(cm|bt|bd|dc|lp|tc)$/i.test(s)
  );
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "db-backups";
const CHUNKED_MANIFEST = "supabase_storage_chunked_v1";

interface RestoreRequest {
  backup_path: string;
  profile_slug_or_id: string;
}

type PointerChunked = {
  format: "chunked_v1";
  manifest_path: string;
};

type PointerLegacy = {
  path?: string;
};

type MonolithicBackup = {
  tables?: {
    profiles?: Array<Record<string, unknown>>;
  };
};

type ManifestTablesEntry = string | string[];

type ChunkedManifest = {
  backup_format: typeof CHUNKED_MANIFEST;
  run_prefix?: string;
  metadata?: { row_layout?: string };
  tables: Record<string, ManifestTablesEntry>;
};

type TableShard = {
  table?: string;
  rows?: Array<Record<string, unknown>>;
};

async function gunzipBytes(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return await new Response(stream).text();
}

async function downloadText(
  supabase: ReturnType<typeof createClient>,
  objectPath: string
): Promise<{ text: string; usedPath: string }> {
  const { data: fileBytes, error: dlErr } = await supabase.storage.from(BUCKET).download(objectPath);
  if (dlErr || !fileBytes) {
    throw new Error(`Could not download ${objectPath}: ${dlErr?.message ?? "unknown"}`);
  }
  const rawBytes = new Uint8Array(await fileBytes.arrayBuffer());
  const isGz = objectPath.endsWith(".gz");
  const text = isGz ? await gunzipBytes(rawBytes) : new TextDecoder().decode(rawBytes);
  return { text, usedPath: objectPath };
}

async function loadTableShard(
  supabase: ReturnType<typeof createClient>,
  shardPath: string
): Promise<Array<Record<string, unknown>>> {
  const { text } = await downloadText(supabase, shardPath);
  const parsed = JSON.parse(text) as TableShard;
  return Array.isArray(parsed.rows) ? parsed.rows : [];
}

/** Valid shard path list; `null` if missing/malformed. Empty array OK (table had zero rows). */
function normalizeTableShards(entry: unknown): string[] | null {
  if (entry === undefined) return null;
  if (typeof entry === "string") return entry.length > 0 ? [entry] : [];
  if (Array.isArray(entry) && entry.every((e) => typeof e === "string")) return entry as string[];
  return null;
}

function isChunkedManifest(x: unknown): x is ChunkedManifest {
  if (!x || typeof x !== "object") return false;
  if ((x as ChunkedManifest).backup_format !== CHUNKED_MANIFEST) return false;
  const tables = (x as ChunkedManifest).tables;
  if (!tables || typeof tables !== "object" || Array.isArray(tables)) return false;
  for (const v of Object.values(tables)) {
    if (typeof v === "string") continue;
    if (Array.isArray(v) && v.every((e) => typeof e === "string")) continue;
    return false;
  }
  return true;
}

async function findProfileAcrossShards(
  supabase: ReturnType<typeof createClient>,
  paths: string[],
  profileKey: string
): Promise<Record<string, unknown> | null> {
  for (const p of paths) {
    const rows = await loadTableShard(supabase, p);
    const hit = rows.find((row) => {
      const id = String(row.id ?? "");
      const slug = String(row.slug ?? "");
      return id === profileKey || slug === profileKey;
    });
    if (hit) return hit;
  }
  return null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isChunkedPointer(x: unknown): x is PointerChunked {
  return !!x && typeof x === "object" && (x as PointerChunked).format === "chunked_v1" &&
    typeof (x as PointerChunked).manifest_path === "string";
}

function isLegacyPointer(x: unknown): x is PointerLegacy {
  if (!x || typeof x !== "object") return false;
  const path = (x as PointerLegacy).path;
  const hasChunked = "format" in x && (x as { format?: string }).format === "chunked_v1";
  return typeof path === "string" && path.length > 0 && !hasChunked;
}

function isMonolithicPayload(x: unknown): x is MonolithicBackup {
  if (!x || typeof x !== "object") return false;
  const tables = (x as MonolithicBackup).tables;
  if (!tables || typeof tables !== "object" || Array.isArray(tables)) return false;
  return true;
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
  const supabase = createClient(supabaseUrl, serviceRole);

  try {
    const body = (await req.json()) as RestoreRequest;
    const backupPath = body.backup_path?.trim();
    const profileKey = body.profile_slug_or_id?.trim();

    if (!backupPath || !profileKey) {
      return new Response(JSON.stringify({ error: "backup_path and profile_slug_or_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!UUID_RE.test(profileKey) && isReimportableCorpusProfileSlug(profileKey)) {
      return new Response(
        JSON.stringify({
          error:
            "This profile is a re-importable CCEL corpus (sg/me/cv/mh/je/lgal) and is not included in backups. Re-run the appropriate npm import script from gospel-admin instead.",
          profile_slug_or_id: profileKey,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let matchedFromBackup: Record<string, unknown> | null = null;

    const { text: initialText, usedPath } = await downloadText(supabase, backupPath);
    let rootParsed: unknown = JSON.parse(initialText);

    if (isChunkedPointer(rootParsed)) {
      const manifestText = (await downloadText(supabase, rootParsed.manifest_path)).text;
      rootParsed = JSON.parse(manifestText);
    } else if (isLegacyPointer(rootParsed)) {
      const mono = (await downloadText(supabase, rootParsed.path!)).text;
      rootParsed = JSON.parse(mono);
    }

    if (isChunkedManifest(rootParsed)) {
      const profilesShards = normalizeTableShards(rootParsed.tables["profiles"]);
      if (profilesShards === null || profilesShards.length === 0) {
        const msg =
          profilesShards === null ? "invalid profiles shard entry in manifest" : "no profiles shards listed";
        return new Response(JSON.stringify({ error: `Chunked backup has ${msg}`, backup_path: backupPath }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const runPrefix = typeof rootParsed.run_prefix === "string" ? rootParsed.run_prefix : "";
      const rowLayout = rootParsed.metadata?.row_layout;

      if (runPrefix && rowLayout === "one_file_per_row" && UUID_RE.test(profileKey)) {
        const directPath = `${runPrefix}/tables/profiles/id-${profileKey}.json.gz`;
        try {
          const rows = await loadTableShard(supabase, directPath);
          const hit = rows.find((row) => {
            const id = String(row.id ?? "");
            const slug = String(row.slug ?? "");
            return id === profileKey || slug === profileKey;
          });
          if (hit) matchedFromBackup = hit;
        } catch {
          /* slug index / scan */
        }
      }

      if (!matchedFromBackup && runPrefix) {
        const idxPath = `${runPrefix}/tables/profiles/_slug_index.json`;
        try {
          const { text } = await downloadText(supabase, idxPath);
          const idx = JSON.parse(text) as { by_slug?: Record<string, string> };
          const idFromSlug = idx.by_slug?.[profileKey];
          if (idFromSlug && UUID_RE.test(idFromSlug)) {
            if (rowLayout === "one_file_per_row") {
              const directPath = `${runPrefix}/tables/profiles/id-${idFromSlug}.json.gz`;
              const rows = await loadTableShard(supabase, directPath);
              matchedFromBackup = rows[0] ?? null;
            } else {
              matchedFromBackup = await findProfileAcrossShards(supabase, profilesShards, idFromSlug);
            }
          }
        } catch {
          /* fall through */
        }
      }

      if (!matchedFromBackup) {
        matchedFromBackup = await findProfileAcrossShards(supabase, profilesShards, profileKey);
      }
    } else if (isMonolithicPayload(rootParsed)) {
      const profiles = rootParsed.tables?.profiles ?? [];
      matchedFromBackup =
        profiles.find((p) => {
          const id = String(p.id ?? "");
          const slug = String(p.slug ?? "");
          return id === profileKey || slug === profileKey;
        }) ?? null;
    } else {
      return new Response(
        JSON.stringify({
          error: `Unrecognized backup payload (expected chunked manifest, latest pointer, or monolithic JSON).`,
          backup_path: usedPath,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!matchedFromBackup) {
      return new Response(
        JSON.stringify({ error: `No profile found in backup for key: ${profileKey}`, backup_path: backupPath }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const restoredSlug = String(matchedFromBackup.slug ?? "");
    if (restoredSlug && isReimportableCorpusProfileSlug(restoredSlug)) {
      return new Response(
        JSON.stringify({
          error:
            "This profile is a re-importable CCEL corpus and is not included in current backups. Re-run the appropriate npm import script from gospel-admin instead.",
          profile_slug: restoredSlug,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: restoredProfile, error: upErr } = await supabase
      .from("profiles")
      .upsert(matchedFromBackup as never, { onConflict: "id" })
      .select("id, slug, title")
      .single();
    if (upErr) throw new Error(`Failed to restore profile row: ${upErr.message}`);

    return new Response(
      JSON.stringify({
        success: true,
        backup_path: backupPath,
        restored_profile: restoredProfile,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
