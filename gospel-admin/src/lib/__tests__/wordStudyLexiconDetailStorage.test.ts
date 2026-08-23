import {
  normalizeWordStudyLexiconDetail,
  readWordStudyLexiconDetailForLanguage,
  readWordStudyLexiconDetailFromStorage,
  WORD_STUDY_LEXICON_DETAIL_STORAGE_KEY,
  writeWordStudyLexiconDetailToStorage,
} from '@/lib/wordStudyLexiconDetailStorage'

describe('wordStudyLexiconDetailStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('normalize treats missing and unknown values as brief', () => {
    expect(normalizeWordStudyLexiconDetail(null)).toBe('brief')
    expect(normalizeWordStudyLexiconDetail('')).toBe('brief')
    expect(normalizeWordStudyLexiconDetail('concordance')).toBe('brief')
    expect(normalizeWordStudyLexiconDetail('full')).toBe('full')
    expect(normalizeWordStudyLexiconDetail('brief')).toBe('brief')
  })

  it('defaults to brief when nothing is stored', () => {
    expect(readWordStudyLexiconDetailFromStorage()).toBe('brief')
  })

  it('persists full until overwritten', () => {
    writeWordStudyLexiconDetailToStorage('full')
    expect(localStorage.getItem(WORD_STUDY_LEXICON_DETAIL_STORAGE_KEY)).toBe('full')
    expect(readWordStudyLexiconDetailFromStorage()).toBe('full')
    writeWordStudyLexiconDetailToStorage('brief')
    expect(readWordStudyLexiconDetailFromStorage()).toBe('brief')
  })

  it('applies stored full only for Greek', () => {
    writeWordStudyLexiconDetailToStorage('full')
    expect(readWordStudyLexiconDetailForLanguage('grc')).toBe('full')
    expect(readWordStudyLexiconDetailForLanguage('heb')).toBe('brief')
    expect(readWordStudyLexiconDetailForLanguage('arc')).toBe('brief')
    expect(readWordStudyLexiconDetailForLanguage(undefined)).toBe('brief')
  })
})
