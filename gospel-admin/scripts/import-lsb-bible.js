#!/usr/bin/env node

/**
 * Import LSB (Legacy Standard Bible) from USX files into Supabase bible_verses table
 * Usage: node import-lsb-bible.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Map USX book codes to full book names (matching KJV book names)
const BOOK_CODE_MAP = {
  // Old Testament
  'GEN': 'Genesis',
  'EXO': 'Exodus',
  'LEV': 'Leviticus',
  'NUM': 'Numbers',
  'DEU': 'Deuteronomy',
  'JOS': 'Joshua',
  'JDG': 'Judges',
  'RUT': 'Ruth',
  '1SA': '1 Samuel',
  '2SA': '2 Samuel',
  '1KI': '1 Kings',
  '2KI': '2 Kings',
  '1CH': '1 Chronicles',
  '2CH': '2 Chronicles',
  'EZR': 'Ezra',
  'NEH': 'Nehemiah',
  'EST': 'Esther',
  'JOB': 'Job',
  'PSA': 'Psalms',
  'PRO': 'Proverbs',
  'ECC': 'Ecclesiastes',
  'SNG': 'Song of Solomon',
  'ISA': 'Isaiah',
  'JER': 'Jeremiah',
  'LAM': 'Lamentations',
  'EZK': 'Ezekiel',
  'DAN': 'Daniel',
  'HOS': 'Hosea',
  'JOL': 'Joel',
  'AMO': 'Amos',
  'OBA': 'Obadiah',
  'JON': 'Jonah',
  'MIC': 'Micah',
  'NAM': 'Nahum',
  'HAB': 'Habakkuk',
  'ZEP': 'Zephaniah',
  'HAG': 'Haggai',
  'ZEC': 'Zechariah',
  'MAL': 'Malachi',
  
  // New Testament
  'MAT': 'Matthew',
  'MRK': 'Mark',
  'LUK': 'Luke',
  'JHN': 'John',
  'ACT': 'Acts',
  'ROM': 'Romans',
  '1CO': '1 Corinthians',
  '2CO': '2 Corinthians',
  'GAL': 'Galatians',
  'EPH': 'Ephesians',
  'PHP': 'Philippians',
  'COL': 'Colossians',
  '1TH': '1 Thessalonians',
  '2TH': '2 Thessalonians',
  '1TI': '1 Timothy',
  '2TI': '2 Timothy',
  'TIT': 'Titus',
  'PHM': 'Philemon',
  'HEB': 'Hebrews',
  'JAS': 'James',
  '1PE': '1 Peter',
  '2PE': '2 Peter',
  '1JN': '1 John',
  '2JN': '2 John',
  '3JN': '3 John',
  'JUD': 'Jude',
  'REV': 'Revelation'
};

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials');
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Parse a USX file and extract verses
 * @param {string} filePath - Path to the USX file
 * @param {string} bookCode - 3-letter book code (GEN, EPH, etc.)
 * @returns {Array} Array of verse objects
 */
function parseUsxFile(filePath, bookCode) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const verses = [];
  
  const bookName = BOOK_CODE_MAP[bookCode];
  if (!bookName) {
    console.warn(`Unknown book code: ${bookCode}`);
    return verses;
  }
  
  // Match verse blocks: <verse ... sid="..." />TEXT<verse eid="..." />
  // This regex captures everything between the opening and closing verse tags
  const verseRegex = /<verse\s+number="(\d+)"[^>]*sid="([^"]+)"[^>]*\/>([\s\S]*?)<verse\s+eid="[^"]*"\s*\/>/g;
  
  let match;
  while ((match = verseRegex.exec(content)) !== null) {
    const verseNum = parseInt(match[1]);
    const sid = match[2]; // e.g., "GEN 1:1"
    let text = match[3];
    
    // Extract chapter from sid (e.g., "GEN 1:1" -> 1)
    const sidMatch = sid.match(/[A-Z0-9]+\s+(\d+):\d+/);
    if (!sidMatch) continue;
    
    const chapter = parseInt(sidMatch[1]);
    
    // Clean up the text:
    // 1. Remove footnotes <note>...</note>
    text = text.replace(/<note[^>]*>[\s\S]*?<\/note>/g, '');
    
    // 2. Remove formatting tags but keep their content
    // Handle nested char tags
    while (/<char[^>]*>/.test(text)) {
      text = text.replace(/<char[^>]*>([\s\S]*?)<\/char>/g, '$1');
    }
    
    // 3. Remove any remaining XML tags
    text = text.replace(/<[^>]+>/g, '');
    
    // 3b. Remove pilcrow paragraph markers (¶)
    text = text.replace(/¶/g, '');
    
    // 4. Decode HTML entities
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&apos;/g, "'");
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&amp;/g, '&');
    
    // 5. Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    if (text && chapter > 0 && verseNum > 0) {
      verses.push({
        translation: 'lsb',
        book: bookName,
        chapter: chapter,
        verse: verseNum,
        text: text
      });
    }
  }
  
  return verses;
}

/**
 * Import verses into Supabase in batches
 */
async function importVerses(verses) {
  const BATCH_SIZE = 500;
  let imported = 0;
  let errors = 0;
  
  for (let i = 0; i < verses.length; i += BATCH_SIZE) {
    const batch = verses.slice(i, i + BATCH_SIZE);
    
    const { error } = await supabase
      .from('bible_verses')
      .upsert(batch, { onConflict: 'translation,book,chapter,verse' });
    
    if (error) {
      console.error(`Error importing batch ${i}-${i + batch.length}:`, error.message);
      errors += batch.length;
    } else {
      imported += batch.length;
      console.log(`Imported ${imported} verses...`);
    }
  }
  
  return { imported, errors };
}

/**
 * Main execution
 */
async function main() {
  const usxDir = path.join(process.env.HOME, 'Downloads', 'text-8011347e1aa60e8a-304880', 'release', 'USX_1');
  
  if (!fs.existsSync(usxDir)) {
    console.error(`USX directory not found: ${usxDir}`);
    process.exit(1);
  }
  
  console.log('Reading USX files from:', usxDir);
  
  const files = fs.readdirSync(usxDir).filter(f => f.endsWith('.usx'));
  console.log(`Found ${files.length} USX files`);
  
  let allVerses = [];
  
  for (const file of files) {
    const bookCode = path.basename(file, '.usx');
    const filePath = path.join(usxDir, file);
    
    console.log(`Parsing ${bookCode}...`);
    const verses = parseUsxFile(filePath, bookCode);
    
    if (verses.length > 0) {
      console.log(`  Found ${verses.length} verses in ${BOOK_CODE_MAP[bookCode] || bookCode}`);
      allVerses = allVerses.concat(verses);
    }
  }
  
  console.log(`\nTotal verses parsed: ${allVerses.length}`);
  console.log('Starting import to Supabase...\n');
  
  const { imported, errors } = await importVerses(allVerses);
  
  console.log('\n=== Import Complete ===');
  console.log(`Successfully imported: ${imported} verses`);
  console.log(`Errors: ${errors} verses`);
  console.log(`Total processed: ${allVerses.length} verses`);
}

main().catch(console.error);
