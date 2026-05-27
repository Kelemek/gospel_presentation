import {
  clearMcheyneStartDate,
  isValidLocalIsoDate,
  loadMcheyneStartDate,
  mcheyneStartDateStorageKey,
  saveMcheyneStartDate,
} from '@/lib/mcheyne/mcheyneStartDateStorage'
import { MCHEYNE_SLUG } from '@/lib/mcheyne/mcheyneSlug'
import { gospelStorageGetSync, resetGospelClientStorageForTests } from '@/lib/gospelClientStorage'
import { installTestLocalStorage } from '@/lib/testing/testLocalStorage'

describe('mcheyneStartDateStorage', () => {
  beforeEach(() => {
    resetGospelClientStorageForTests()
    installTestLocalStorage()
  })

  it('uses a versioned key per slug', () => {
    expect(mcheyneStartDateStorageKey(MCHEYNE_SLUG)).toBe('gospel-mcheyne-start:v1:mchy')
  })

  it('validates ISO dates', () => {
    expect(isValidLocalIsoDate('2026-05-21')).toBe(true)
    expect(isValidLocalIsoDate('2026-13-01')).toBe(false)
    expect(isValidLocalIsoDate('2026-02-30')).toBe(false)
  })

  it('round-trips start date', () => {
    expect(loadMcheyneStartDate(MCHEYNE_SLUG)).toBeNull()
    saveMcheyneStartDate('2026-01-01', MCHEYNE_SLUG)
    expect(loadMcheyneStartDate(MCHEYNE_SLUG)).toBe('2026-01-01')
    expect(gospelStorageGetSync(mcheyneStartDateStorageKey(MCHEYNE_SLUG))).toBe('2026-01-01')
  })

  it('clears stored start date', () => {
    saveMcheyneStartDate('2026-01-01', MCHEYNE_SLUG)
    clearMcheyneStartDate(MCHEYNE_SLUG)
    expect(loadMcheyneStartDate(MCHEYNE_SLUG)).toBeNull()
  })
})
