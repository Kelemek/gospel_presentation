#!/usr/bin/env node
/**
 * One-time purge of all objects in the private `db-backups` Storage bucket.
 * Use after deploying corpus-exclusion backup changes to reclaim space.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY (and NEXT_PUBLIC_SUPABASE_URL) in .env.local.
 *
 *   node scripts/purge-db-backups-bucket.js --dry-run
 *   node scripts/purge-db-backups-bucket.js
 *
 * After purge: deploy Edge `backup-to-storage`, POST {} for one full backup,
 * and VACUUM FULL storage.objects in SQL Editor if database size stays high.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const { createClient } = require('@supabase/supabase-js');

const BUCKET = 'db-backups';
const LIST_PAGE = 1000;
const REMOVE_BATCH = 100;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const dryRun = process.argv.includes('--dry-run');

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

/** BFS: delete files as discovered; queue folders — avoids loading 100k+ paths in memory. */
async function purgeBucketStreaming() {
  const queue = [''];
  let removed = 0;
  let listed = 0;

  while (queue.length > 0) {
    const prefix = queue.shift();
    let offset = 0;
    for (;;) {
      const { data, error } = await supabase.storage.from(BUCKET).list(prefix || '', {
        limit: LIST_PAGE,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error) throw error;
      const items = data ?? [];
      listed += items.length;
      const fileBatch = [];
      for (const item of items) {
        const full = prefix ? `${prefix}/${item.name}` : item.name;
        if (item.id == null) {
          queue.push(full);
        } else {
          fileBatch.push(full);
        }
      }
      while (fileBatch.length > 0) {
        const batch = fileBatch.splice(0, REMOVE_BATCH);
        if (!dryRun) {
          const { error: rmErr } = await supabase.storage.from(BUCKET).remove(batch);
          if (rmErr) throw rmErr;
        }
        removed += batch.length;
        if (removed % 5000 === 0 || (removed > 0 && fileBatch.length === 0 && items.length < LIST_PAGE)) {
          console.log(dryRun ? `[dry-run] would remove ${removed} file(s) so far` : `Removed ${removed} file(s)…`);
        }
      }
      if (items.length < LIST_PAGE) break;
      offset += LIST_PAGE;
    }
  }
  return { removed, listed };
}

async function main() {
  console.log(`${dryRun ? 'Dry-run' : 'Purging'} bucket ${BUCKET}…`);
  const { removed } = await purgeBucketStreaming();
  console.log(
    dryRun
      ? `Done. Would remove ${removed} file object(s). Re-run without --dry-run to purge.`
      : `Done. Removed ${removed} file object(s). Deploy backup-to-storage and run one full backup.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
