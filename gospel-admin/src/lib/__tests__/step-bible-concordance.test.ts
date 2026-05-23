/** @jest-environment node */

import {
  clearStepBibleConcordanceCache,
  isConcordanceDataPresent,
  lookupConcordance,
} from '@/lib/step-bible-concordance'
import {
  ensureStepBibleTestFixtures,
  stepBibleHasFullWordImport,
} from '@/lib/test/ensureStepBibleTestFixtures'

describe('step-bible-concordance', () => {
  beforeAll(() => {
    ensureStepBibleTestFixtures()
    clearStepBibleConcordanceCache()
  })

  it('detects concordance data', () => {
    expect(isConcordanceDataPresent()).toBe(true)
  })

  it('looks up occurrences by normalized Strong’s', () => {
    const result = lookupConcordance('G3339')
    expect(result?.strongs).toBe('G3339')
    expect(result?.total).toBeGreaterThanOrEqual(1)
    expect(result?.occurrences.some((o) => o.reference === 'Romans 12:2')).toBe(true)
  })

  it('paginates results', () => {
    const full = lookupConcordance('G3339')
    const total = full?.total ?? 0
    const page = lookupConcordance('G3339', 0, 1)
    expect(page?.occurrences).toHaveLength(1)
    const empty = lookupConcordance('G3339', total + 5, 10)
    expect(empty?.occurrences).toHaveLength(0)
    expect(empty?.total).toBe(total)
  })

  it('returns null for unknown key', () => {
    expect(lookupConcordance('G999999')).toBeNull()
  })

  it('looks up Hebrew Strong’s', () => {
    const result = lookupConcordance('H430')
    expect(result?.strongs).toBe('H430')
    if (stepBibleHasFullWordImport()) {
      expect(result?.total).toBeGreaterThan(100)
      let offset = 0
      let foundGenesis11 = false
      while (result && offset < result.total) {
        const page = lookupConcordance('H430', offset, 200)
        if (page?.occurrences.some((o) => o.passageKey === 'GEN.1.1')) {
          foundGenesis11 = true
          break
        }
        offset += 200
      }
      expect(foundGenesis11).toBe(true)
    } else {
      expect(result?.occurrences[0].reference).toBe('Genesis 1:1')
    }
  })
})
