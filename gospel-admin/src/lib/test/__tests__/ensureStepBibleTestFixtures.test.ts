import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import {
  ensureStepBibleTestFixtures,
  stepBibleConcordancePresent,
  stepBibleHasFullWordImport,
  stepBibleHasMinimalTestFixtures,
  stepBibleLexiconPresent,
} from '@/lib/test/ensureStepBibleTestFixtures'

jest.mock('fs')
jest.mock('child_process', () => ({
  execSync: jest.fn(),
}))

const mockFs = fs as jest.Mocked<typeof fs>
const mockExec = execSync as jest.MockedFunction<typeof execSync>

const STEP_ROOT = path.join(process.cwd(), 'data', 'stepbible')
const GEN1 = path.join(STEP_ROOT, 'words', 'GEN', '1.json')
const ROM12 = path.join(STEP_ROOT, 'words', 'ROM', '12.json')
const LEXICON = path.join(STEP_ROOT, 'lexicon', 'greek.json')
const CONCORDANCE = path.join(STEP_ROOT, 'concordance', 'greek', 'G33.json')

describe('stepBible fixture detection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('stepBibleHasFullWordImport is false when gen1 is missing', () => {
    mockFs.existsSync.mockReturnValue(false)
    expect(stepBibleHasFullWordImport()).toBe(false)
  })

  it('stepBibleHasFullWordImport is true when gen1 has more than 10 keys', () => {
    mockFs.existsSync.mockImplementation((p) => p === GEN1)
    const chapter = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`${i}`, {}]))
    mockFs.readFileSync.mockReturnValue(JSON.stringify(chapter))
    expect(stepBibleHasFullWordImport()).toBe(true)
  })

  it('stepBibleHasMinimalTestFixtures detects ROM 12 strongs', () => {
    mockFs.existsSync.mockImplementation((p) => p === ROM12)
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify({
        '2': { words: [{ strongs: 'G3339' }] },
        '3': { words: [{ strongs: 'G3004' }] },
      })
    )
    expect(stepBibleHasMinimalTestFixtures()).toBe(true)
  })

  it('returns false when JSON read or parse fails', () => {
    mockFs.existsSync.mockReturnValue(true)
    mockFs.readFileSync.mockImplementation(() => {
      throw new Error('read fail')
    })
    expect(stepBibleHasFullWordImport()).toBe(false)
    expect(stepBibleHasMinimalTestFixtures()).toBe(false)
  })

  it('stepBibleLexiconPresent and stepBibleConcordancePresent check disk paths', () => {
    mockFs.existsSync.mockImplementation((p) => p === LEXICON)
    expect(stepBibleLexiconPresent()).toBe(true)
    mockFs.existsSync.mockImplementation((p) => p === CONCORDANCE)
    expect(stepBibleConcordancePresent()).toBe(true)
  })
})

describe('ensureStepBibleTestFixtures', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('skips import when full word data is on disk', () => {
    mockFs.existsSync.mockImplementation((p) => p === GEN1)
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify(Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`${i}`, {}])))
    )

    ensureStepBibleTestFixtures()
    expect(mockExec).not.toHaveBeenCalled()
  })

  it('skips import when minimal fixtures, lexicon, and concordance exist', () => {
    mockFs.existsSync.mockImplementation((p) => p === ROM12 || p === LEXICON || p === CONCORDANCE)
    mockFs.readFileSync.mockImplementation((p) => {
      if (p === ROM12) {
        return JSON.stringify({
          '2': { words: [{ strongs: 'G3339' }] },
          '3': { words: [{ strongs: 'G3004' }] },
        })
      }
      throw new Error('unexpected read')
    })

    ensureStepBibleTestFixtures()
    expect(mockExec).not.toHaveBeenCalled()
  })

  it('runs fixtures-only import when data is incomplete', () => {
    mockFs.existsSync.mockReturnValue(false)

    ensureStepBibleTestFixtures()

    expect(mockExec).toHaveBeenCalledWith(
      'node scripts/import-stepbible-data.js --fixtures-only',
      expect.objectContaining({ cwd: process.cwd(), stdio: 'pipe' })
    )
  })
})
