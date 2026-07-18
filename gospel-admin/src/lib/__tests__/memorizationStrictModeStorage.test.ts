import {
  GOSPEL_MEMORIZATION_STRICT_MODE_CHANGED_EVENT,
  MEMORIZATION_STRICT_MODE_STORAGE_KEY,
  normalizeMemorizationStrictMode,
  readMemorizationStrictModeFromStorage,
  writeMemorizationStrictModeToStorage,
} from '@/lib/memorizationStrictModeStorage'
import { installTestLocalStorage } from '@/lib/testing/testLocalStorage'

describe('memorizationStrictModeStorage', () => {
  beforeEach(() => {
    installTestLocalStorage()
  })

  it('normalize returns false unless value is true', () => {
    expect(normalizeMemorizationStrictMode(null)).toBe(false)
    expect(normalizeMemorizationStrictMode('')).toBe(false)
    expect(normalizeMemorizationStrictMode('false')).toBe(false)
    expect(normalizeMemorizationStrictMode('true')).toBe(true)
  })

  it('read returns false by default', () => {
    expect(readMemorizationStrictModeFromStorage()).toBe(false)
  })

  it('write persists and dispatches change event', () => {
    const handler = jest.fn()
    window.addEventListener(GOSPEL_MEMORIZATION_STRICT_MODE_CHANGED_EVENT, handler)
    writeMemorizationStrictModeToStorage(true)
    expect(window.localStorage.getItem(MEMORIZATION_STRICT_MODE_STORAGE_KEY)).toBe('true')
    expect(readMemorizationStrictModeFromStorage()).toBe(true)
    expect(handler).toHaveBeenCalled()
    window.removeEventListener(GOSPEL_MEMORIZATION_STRICT_MODE_CHANGED_EVENT, handler)
  })
})
