import {
  readScriptureShowWordsOfChristFromStorage,
  SCRIPTURE_SHOW_WORDS_OF_CHRIST_STORAGE_KEY,
  writeScriptureShowWordsOfChristToStorage,
} from '@/lib/scriptureWordsOfChristPreference'

describe('scriptureWordsOfChristPreference', () => {
  beforeEach(() => {
    localStorage.removeItem(SCRIPTURE_SHOW_WORDS_OF_CHRIST_STORAGE_KEY)
  })

  it('defaults to showing words of Christ', () => {
    expect(readScriptureShowWordsOfChristFromStorage()).toBe(true)
  })

  it('persists false to localStorage', () => {
    writeScriptureShowWordsOfChristToStorage(false)
    expect(localStorage.getItem(SCRIPTURE_SHOW_WORDS_OF_CHRIST_STORAGE_KEY)).toBe('false')
    expect(readScriptureShowWordsOfChristFromStorage()).toBe(false)
  })
})
