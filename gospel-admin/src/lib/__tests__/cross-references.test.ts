import {
  clearCrossReferencesCache,
  compareCrossReferencesByCanon,
  countCrossReferences,
  isCrossReferenceDataPresent,
  lookupCrossReferences,
} from '@/lib/cross-references'
import { ensureCrossReferenceTestFixtures } from '@/lib/test/ensureCrossReferenceTestFixtures'

describe('cross-references', () => {
  beforeAll(() => {
    ensureCrossReferenceTestFixtures()
  })

  beforeEach(() => {
    clearCrossReferencesCache()
  })

  it('detects fixture data', () => {
    expect(isCrossReferenceDataPresent()).toBe(true)
  })

  it('returns Romans 8:28 cross references in Protestant canon order', () => {
    const result = lookupCrossReferences('Romans 8:28', 0, 200)
    expect(result).not.toBeNull()
    expect(result!.total).toBeGreaterThan(0)
    expect(result!.items[0]?.reference).toMatch(/^[A-Za-z0-9]/)
    expect(countCrossReferences('Romans 8:28')).toBe(result!.total)
    for (let i = 1; i < result!.items.length; i++) {
      expect(compareCrossReferencesByCanon(result!.items[i - 1]!, result!.items[i]!)).toBeLessThanOrEqual(
        0
      )
    }
    expect(result!.items[0]?.reference).toMatch(/^Genesis /)
  })

  it('unions multi-verse ranges', () => {
    const single = lookupCrossReferences('Romans 8:1', 0, 200)
    const range = lookupCrossReferences('Romans 8:1-2', 0, 200)
    expect(single).not.toBeNull()
    expect(range).not.toBeNull()
    expect(range!.total).toBeGreaterThanOrEqual(single!.total)
  })
})
