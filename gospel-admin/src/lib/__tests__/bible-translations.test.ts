import { BIBLE_TRANSLATION_CODES, mergeTranslationReportCodes } from '../bible-translations'

describe('mergeTranslationReportCodes', () => {
  it('returns all supported codes in canonical order when logs are empty', () => {
    expect(mergeTranslationReportCodes([])).toEqual([...BIBLE_TRANSLATION_CODES])
  })

  it('fills in missing translations when API only returns distinct codes from logs', () => {
    expect(mergeTranslationReportCodes(['csb', 'esv', 'kjv', 'lsb'])).toEqual([
      ...BIBLE_TRANSLATION_CODES,
    ])
  })

  it('appends unknown legacy codes from the database sorted', () => {
    expect(mergeTranslationReportCodes(['esv', 'legacy_x', 'legacy_a'])).toEqual([
      ...BIBLE_TRANSLATION_CODES,
      'legacy_a',
      'legacy_x',
    ])
  })
})
