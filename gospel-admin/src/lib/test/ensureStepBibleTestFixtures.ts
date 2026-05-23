import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const STEP_ROOT = path.join(process.cwd(), 'data', 'stepbible')

/** True when a full `npm run import-stepbible` is present (not minimal Jest fixtures). */
export function stepBibleHasFullWordImport(): boolean {
  const gen1Path = path.join(STEP_ROOT, 'words', 'GEN', '1.json')
  if (!fs.existsSync(gen1Path)) return false
  try {
    const chapter = JSON.parse(fs.readFileSync(gen1Path, 'utf8')) as Record<string, unknown>
    return Object.keys(chapter).length > 10
  } catch {
    return false
  }
}

/** Minimal fixture chapters used by Jest (do not run after a full import). */
export function stepBibleHasMinimalTestFixtures(): boolean {
  const rom12Path = path.join(STEP_ROOT, 'words', 'ROM', '12.json')
  if (!fs.existsSync(rom12Path)) return false
  try {
    const chapter = JSON.parse(fs.readFileSync(rom12Path, 'utf8')) as Record<
      string,
      { words?: { strongs?: string }[] }
    >
    const v2 = chapter['2']?.words ?? []
    const v3 = chapter['3']?.words ?? []
    return (
      v2.some((w) => w.strongs === 'G3339') && v3.some((w) => w.strongs === 'G3004')
    )
  } catch {
    return false
  }
}

export function stepBibleLexiconPresent(): boolean {
  return fs.existsSync(path.join(STEP_ROOT, 'lexicon', 'greek.json'))
}

export function stepBibleConcordancePresent(): boolean {
  return fs.existsSync(path.join(STEP_ROOT, 'concordance', 'greek', 'G33.json'))
}

/**
 * Import minimal STEPBible fixtures for CI/local when data is missing.
 * Skips when a full word import is already on disk so dev reimports are not clobbered.
 */
export function ensureStepBibleTestFixtures(): void {
  if (stepBibleHasFullWordImport()) return
  if (
    stepBibleHasMinimalTestFixtures() &&
    stepBibleLexiconPresent() &&
    stepBibleConcordancePresent()
  ) {
    return
  }
  execSync('node scripts/import-stepbible-data.js --fixtures-only', {
    cwd: process.cwd(),
    stdio: 'pipe',
  })
}
