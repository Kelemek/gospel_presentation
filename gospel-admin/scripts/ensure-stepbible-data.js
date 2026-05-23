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

function concordanceDataReady() {
  const concordRoot = path.join(ROOT, 'concordance')
  if (!fs.existsSync(concordRoot)) return false
  try {
    for (const lang of ['greek', 'hebrew']) {
      const dir = path.join(concordRoot, lang)
      if (!fs.existsSync(dir)) return false
      const shards = fs.readdirSync(dir).filter((name) => name.endsWith('.json'))
      if (shards.length === 0) return false
    }
    return true
  } catch {
    return false
  }
}

function stepBibleDataReady() {
  if (!fs.existsSync(WORDS_DIR)) return false
  try {
    const books = fs.readdirSync(WORDS_DIR).filter((name) => !name.startsWith('.'))
    if (books.length === 0) return false
    return concordanceDataReady()
  } catch {
    return false
  }
}

function main() {
  if (process.env.SKIP_STEPBIBLE_IMPORT === '1') {
    console.log('SKIP_STEPBIBLE_IMPORT=1 — skipping STEPBible import')
    process.exit(0)
  }

  if (process.env.FORCE_STEPBIBLE_REIMPORT === '1' && fs.existsSync(WORDS_DIR)) {
    console.log('FORCE_STEPBIBLE_REIMPORT=1 — removing existing data/stepbible/words')
    fs.rmSync(WORDS_DIR, { recursive: true, force: true })
  }

  if (stepBibleDataReady()) {
    console.log('STEPBible data (words + concordance) already present — skipping import')
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
