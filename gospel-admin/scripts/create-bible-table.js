#!/usr/bin/env node
/**
 * Create bible_verses table in Supabase
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTable() {
  console.log('Creating bible_verses table...');
  
  const sql = fs.readFileSync(path.join(__dirname, '../sql/create_bible_verses_table.sql'), 'utf8');
  
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    console.error('Error creating table:', error);
    console.log('\nPlease run the SQL manually in Supabase SQL Editor:');
    console.log(sql);
    process.exit(1);
  }
  
  console.log('Table created successfully!');
}

createTable();
