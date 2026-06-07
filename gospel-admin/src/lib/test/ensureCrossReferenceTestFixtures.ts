import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const CROSSREF_ROOT = path.join(process.cwd(), 'data', 'crossrefs')

export function crossReferenceFixturesPresent(): boolean {
  return fs.existsSync(path.join(CROSSREF_ROOT, 'ROM', '8.json'))
}

export function ensureCrossReferenceTestFixtures(): void {
  if (crossReferenceFixturesPresent()) return
  execSync('node scripts/import-cross-references.js --fixtures-only', {
    cwd: process.cwd(),
    stdio: 'pipe',
  })
}
