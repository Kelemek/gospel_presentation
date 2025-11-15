#!/usr/bin/env node
/**
 * Import KJV Bible data into Supabase bible_verses table
 * 
 * Usage: node import-kjv-bible.js
 * 
 * This script:
 * 1. Reads the KJV JSON data downloaded from scrollmapper/bible_databases
 * 2. Transforms it into our bible_verses table structure
 * 3. Imports it into Supabase in batches for efficiency
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function importKJV() {
  console.log('Starting KJV Bible import...');
  
  // Read the KJV JSON file
  const kjvPath = path.join(__dirname, '../../kjv_data.json');
  console.log(`Reading KJV data from: ${kjvPath}`);
  
  const kjvData = JSON.parse(fs.readFileSync(kjvPath, 'utf8'));
  console.log(`Translation: ${kjvData.translation}`);
  console.log(`Books: ${kjvData.books.length}`);
  
  // Transform data into flat array of verses
  const verses = [];
  let totalVerses = 0;
  
  for (const book of kjvData.books) {
    const bookName = book.name;
    console.log(`Processing ${bookName}...`);
    
    for (const chapterData of book.chapters) {
      const chapterNum = chapterData.chapter;
      
      for (const verseData of chapterData.verses) {
        verses.push({
          translation: 'kjv',
          book: bookName,
          chapter: chapterNum,
          verse: verseData.verse,
          text: verseData.text
        });
        totalVerses++;
      }
    }
  }
  
  console.log(`\nTotal verses to import: ${totalVerses}`);
  console.log('Starting database import...');
  
  // Import in batches of 500 (Supabase limit is 1000)
  const batchSize = 500;
  let imported = 0;
  let errors = 0;
  
  for (let i = 0; i < verses.length; i += batchSize) {
    const batch = verses.slice(i, i + batchSize);
    
    try {
      const { error } = await supabase
        .from('bible_verses')
        .insert(batch);
      
      if (error) {
        console.error(`Error importing batch ${i / batchSize + 1}:`, error.message);
        errors++;
      } else {
        imported += batch.length;
        const progress = ((i + batch.length) / verses.length * 100).toFixed(1);
        process.stdout.write(`\rProgress: ${progress}% (${imported}/${totalVerses} verses)`);
      }
    } catch (err) {
      console.error(`\nException importing batch ${i / batchSize + 1}:`, err.message);
      errors++;
    }
  }
  
  console.log(`\n\nImport complete!`);
  console.log(`Successfully imported: ${imported} verses`);
  console.log(`Errors: ${errors}`);
  
  // Verify import
  const { count, error } = await supabase
    .from('bible_verses')
    .select('*', { count: 'exact', head: true })
    .eq('translation', 'kjv');
  
  if (error) {
    console.error('Error verifying import:', error.message);
  } else {
    console.log(`\nVerification: ${count} KJV verses in database`);
  }
}

importKJV().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
