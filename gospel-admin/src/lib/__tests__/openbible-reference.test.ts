import {
  openBibleBookToUsfm,
  openBibleTargetToCrossReference,
  parseOpenBibleVerseToken,
} from '@/lib/openbible-reference'

describe('openbible-reference', () => {
  it('maps OpenBible book abbrevs to USFM', () => {
    expect(openBibleBookToUsfm('Rom')).toBe('ROM')
    expect(openBibleBookToUsfm('Matt')).toBe('MAT')
    expect(openBibleBookToUsfm('John')).toBe('JHN')
    expect(openBibleBookToUsfm('Ps')).toBe('PSA')
  })

  it('parses single-verse tokens', () => {
    expect(parseOpenBibleVerseToken('Rom.8.28')).toEqual({
      usfm: 'ROM',
      chapter: 8,
      verse: 28,
      passageKey: 'ROM.8.28',
    })
  })

  it('formats range targets', () => {
    expect(openBibleTargetToCrossReference('Ps.23.1-Ps.23.2')).toEqual({
      passageKey: 'PSA.23.1',
      reference: 'Psalms 23:1–2',
    })
  })

  it('formats single targets', () => {
    expect(openBibleTargetToCrossReference('Jer.29.11')).toEqual({
      passageKey: 'JER.29.11',
      reference: 'Jeremiah 29:11',
    })
  })
})
