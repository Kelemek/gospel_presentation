import {
  SCRIPTURE_SHOW_VERSE_NUMBERS_STORAGE_KEY,
  writeScriptureShowVerseNumbersToStorage,
} from '@/lib/scriptureVerseNumbersPreference'
import {
  SCRIPTURE_SHOW_WORDS_OF_CHRIST_STORAGE_KEY,
  writeScriptureShowWordsOfChristToStorage,
} from '@/lib/scriptureWordsOfChristPreference'
import {
  captureScriptureReaderTourDisplayPrefs,
  ensureScriptureReaderTourRedLetterFetchEnabled,
  restoreScriptureReaderTourDisplayPrefs,
} from '../tourSharedDomHelpers'

describe('scriptureReaderTourDisplayPrefs', () => {
  beforeEach(() => {
    localStorage.clear()
    writeScriptureShowVerseNumbersToStorage(true)
    writeScriptureShowWordsOfChristToStorage(true)
  })

  it('captureScriptureReaderTourDisplayPrefs reads storage', () => {
    writeScriptureShowVerseNumbersToStorage(false)
    writeScriptureShowWordsOfChristToStorage(false)
    expect(captureScriptureReaderTourDisplayPrefs()).toEqual({
      showVerseNumbers: false,
      showWordsOfChrist: false,
    })
  })

  it('restoreScriptureReaderTourDisplayPrefs writes storage from snapshot', () => {
    writeScriptureShowVerseNumbersToStorage(false)
    writeScriptureShowWordsOfChristToStorage(false)
    restoreScriptureReaderTourDisplayPrefs({
      showVerseNumbers: true,
      showWordsOfChrist: false,
    })
    expect(localStorage.getItem(SCRIPTURE_SHOW_VERSE_NUMBERS_STORAGE_KEY)).toBe('true')
    expect(localStorage.getItem(SCRIPTURE_SHOW_WORDS_OF_CHRIST_STORAGE_KEY)).toBe('false')
  })

  it('ensureScriptureReaderTourRedLetterFetchEnabled turns on red letter when off', () => {
    writeScriptureShowWordsOfChristToStorage(false)
    ensureScriptureReaderTourRedLetterFetchEnabled()
    expect(localStorage.getItem(SCRIPTURE_SHOW_WORDS_OF_CHRIST_STORAGE_KEY)).toBe('true')
  })

  it('ensureScriptureReaderTourRedLetterFetchEnabled is a no-op when already on', () => {
    writeScriptureShowWordsOfChristToStorage(true)
    ensureScriptureReaderTourRedLetterFetchEnabled()
    expect(localStorage.getItem(SCRIPTURE_SHOW_WORDS_OF_CHRIST_STORAGE_KEY)).toBe('true')
  })
})
