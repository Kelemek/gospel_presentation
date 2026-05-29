import {
  readScriptureShowVerseNumbersFromStorage,
  SCRIPTURE_SHOW_VERSE_NUMBERS_STORAGE_KEY,
  subscribeScriptureShowVerseNumbers,
  writeScriptureShowVerseNumbersToStorage,
} from '@/lib/scriptureVerseNumbersPreference'

describe('scriptureVerseNumbersPreference', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to showing verse numbers', () => {
    expect(readScriptureShowVerseNumbersFromStorage()).toBe(true)
  })

  it('persists hide preference', () => {
    writeScriptureShowVerseNumbersToStorage(false)
    expect(localStorage.getItem(SCRIPTURE_SHOW_VERSE_NUMBERS_STORAGE_KEY)).toBe('false')
    expect(readScriptureShowVerseNumbersFromStorage()).toBe(false)
  })

  it('notifies subscribers on write', () => {
    const listener = jest.fn()
    const unsubscribe = subscribeScriptureShowVerseNumbers(listener)
    writeScriptureShowVerseNumbersToStorage(false)
    expect(listener).toHaveBeenCalled()
    unsubscribe()
  })
})
