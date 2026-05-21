#!/usr/bin/env node
/**
 * Ensure STEPBible JSON exists before `next build` (e.g. Vercel, where data/ is gitignored).
 * Skips when words/ is already populated or SKIP_STEPBIBLE_IMPORT=1.
 */
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', 'data', 'stepbible')
const WORDS_DIR = path.join(ROOT, 'words')

function stepBibleDataReady() {
  if (!fs.existsSync(WORDS_DIR)) return false
  try {
    const books = fs.readdirSync(WORDS_DIR).filter((name) => !name.startsWith('.'))
    return books.length > 0
  } catch {
    return false
  }
}

function main() {
  if (process.env.SKIP_STEPBIBLE_IMPORT === '1') {
    console.log('SKIP_STEPBIBLE_IMPORT=1 — skipping STEPBible import')
    process.exit(0)
  }

  if (stepBibleDataReady()) {
    console.log('STEPBible data already present under data/stepbible/words — skipping import')
    process.exit(0)
  }

  const args = process.env.STEPBIBLE_IMPORT_FIXTURES_ONLY === '1' ? ['--fixtures-only'] : []
  console.log(
    args.length
      ? 'Importing STEPBible fixtures (STEPBIBLE_IMPORT_FIXTURES_ONLY=1)...'
      : 'Importing full STEPBible data (~15–20 min, downloads from GitHub)...'
  )
  execSync(`node scripts/import-stepbible-data.js ${args.join(' ')}`.trim(), {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  })
}

main()
