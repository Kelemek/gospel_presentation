#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function run() {
  const slugs = process.argv.slice(2);
  if (!slugs.length) {
    console.log('Usage: node restore-from-backup.js slug1 slug2 ...');
    process.exit(1);
  }
  const backupsDir = path.join(__dirname, '../data/backups');
  for (const slug of slugs) {
    const f = path.join(backupsDir, 'backup-' + slug + '-20260304.json');
    if (!fs.existsSync(f)) {
      console.log('No backup for', slug);
      continue;
    }
    const data = JSON.parse(fs.readFileSync(f, 'utf8'));
    const { error } = await supabase.from('profiles').update({ gospel_data: data.gospel_data }).eq('slug', slug);
    if (error) console.error(slug, error);
    else console.log('Restored', data.title);
  }
}
run().catch(console.error);
