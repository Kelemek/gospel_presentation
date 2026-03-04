#!/usr/bin/env node
/**
 * Export the "Physical Intimacy: A Biblical Perspective" profile from Supabase.
 * Saves gospel_data and profile metadata to data/physical-intimacy-export.json
 * Run: node scripts/export-physical-intimacy-profile.js
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function exportProfile() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, slug, title, description, gospel_data, is_template, is_public')
    .ilike('title', '%Physical Intimacy%')
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching profile:', error);
    process.exit(1);
  }

  if (!data) {
    console.error('Profile "Physical Intimacy: A Biblical Perspective" not found.');
    process.exit(1);
  }

  const outPath = path.join(__dirname, '../data/physical-intimacy-export.json');
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
  console.log('Exported to', outPath);
  console.log('Title:', data.title);
  console.log('Slug:', data.slug);
  console.log('Sections:', data.gospel_data?.length ?? 0);
}

exportProfile().catch(console.error);
