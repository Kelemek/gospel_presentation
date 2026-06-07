#!/usr/bin/env node
/**
 * Ensure OpenBible cross-reference JSON exists before `next build`.
 * Skips when data/crossrefs is populated or SKIP_CROSSREF_IMPORT=1.
 */
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', 'data', 'crossrefs')

function crossReferenceDataReady() {
  if (!fs.existsSync(ROOT)) return false
  try {
    const books = fs.readdirSync(ROOT).filter((name) => !name.startsWith('.'))
    if (books.length === 0) return false
    for (const book of books) {
      const dir = path.join(ROOT, book)
      if (!fs.statSync(dir).isDirectory()) continue
      const chapters = fs.readdirSync(dir).filter((name) => name.endsWith('.json'))
      if (chapters.length > 0) return true
    }
    return false
  } catch {
    return false
  }
}

function main() {
  if (process.env.SKIP_CROSSREF_IMPORT === '1') {
    console.log('SKIP_CROSSREF_IMPORT=1 — skipping cross-reference import')
    process.exit(0)
  }

  if (crossReferenceDataReady()) {
    console.log('Cross-reference data already present — skipping import')
    process.exit(0)
  }

  const args = process.env.CROSSREF_IMPORT_FIXTURES_ONLY === '1' ? ['--fixtures-only'] : []
  console.log(
    args.length
      ? 'Importing cross-reference fixtures (CROSSREF_IMPORT_FIXTURES_ONLY=1)…'
      : 'Importing OpenBible cross-reference data…'
  )
  execSync(`node scripts/import-cross-references.js ${args.join(' ')}`.trim(), {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  })
}

main()
