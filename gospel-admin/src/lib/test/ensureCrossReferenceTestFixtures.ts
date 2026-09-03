import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const CROSSREF_ROOT = path.join(process.cwd(), 'data', 'crossrefs')
const IMPORT_LOCK_DIR = path.join(CROSSREF_ROOT, '.import-lock')
const IMPORT_WAIT_MS = 100
const IMPORT_TIMEOUT_MS = 120_000

export function crossReferenceFixturesPresent(): boolean {
  return fs.existsSync(path.join(CROSSREF_ROOT, 'ROM', '8.json'))
}

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

function tryAcquireImportLock(): boolean {
  try {
    fs.mkdirSync(CROSSREF_ROOT, { recursive: true })
    fs.mkdirSync(IMPORT_LOCK_DIR)
    return true
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'EEXIST') return false
    throw err
  }
}

function releaseImportLock(): void {
  fs.rmSync(IMPORT_LOCK_DIR, { recursive: true, force: true })
}

/**
 * Import Romans 8 + Genesis 1 shards when missing.
 * Serializes parallel Jest workers so one import cannot wipe the tree under another.
 */
export function ensureCrossReferenceTestFixtures(): void {
  if (crossReferenceFixturesPresent()) return

  const deadline = Date.now() + IMPORT_TIMEOUT_MS
  while (!crossReferenceFixturesPresent()) {
    if (Date.now() > deadline) {
      throw new Error('Timed out waiting for cross-reference test fixtures')
    }
    if (!tryAcquireImportLock()) {
      sleepSync(IMPORT_WAIT_MS)
      continue
    }
    try {
      if (crossReferenceFixturesPresent()) return
      execSync('node scripts/import-cross-references.js --fixtures-only', {
        cwd: process.cwd(),
        stdio: 'pipe',
      })
    } finally {
      releaseImportLock()
    }
  }
}
