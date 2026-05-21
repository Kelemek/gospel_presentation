import {
  isAramaicVerse,
  parseStepBibleWordLineRef,
  stepRefToUsfmPassageId,
  usfmPassageIdToStepRef,
  wordStudyAvailableFromReference,
  wordStudyLanguageLabelFromReference,
  wordStudyTargetFromReference,
  wordStudyTargetsFromReference,
} from '@/lib/step-bible-reference'

describe('step-bible-reference', () => {
  it('maps USFM to STEPBible ref', () => {
    expect(usfmPassageIdToStepRef('JHN.3.16')).toBe('Jhn.3.16')
    expect(usfmPassageIdToStepRef('ROM.12.2')).toBe('Rom.12.2')
    expect(usfmPassageIdToStepRef('GEN.1.1')).toBe('Gen.1.1')
    expect(usfmPassageIdToStepRef('1CO.13.4')).toBe('1Co.13.4')
  })

  it('maps STEPBible ref to USFM', () => {
    expect(stepRefToUsfmPassageId('Rom.12.2')).toBe('ROM.12.2')
    expect(stepRefToUsfmPassageId('Gen.1.1')).toBe('GEN.1.1')
  })

  it('parses word data line prefix', () => {
    const row = parseStepBibleWordLineRef('Rom.12.2#08=NK(o)\tμεταμορφοῦσθε')
    expect(row).toEqual({
      stepBook: 'Rom',
      chapter: 12,
      verse: 2,
      usfm: 'ROM',
      stepRef: 'Rom.12.2',
      passageKey: 'ROM.12.2',
    })
  })

  it('parses bracket alternate verse (STEP vs ESV numbering)', () => {
    const row = parseStepBibleWordLineRef('2Co.13.13[13.14]#01=NKO\tἩ (Hē)')
    expect(row).toEqual({
      stepBook: '2Co',
      chapter: 13,
      verse: 14,
      usfm: '2CO',
      stepRef: '2Co.13.14',
      passageKey: '2CO.13.14',
    })
  })

  it('wordStudyTargetsFromReference expands verse ranges', () => {
    const targets = wordStudyTargetsFromReference('John 3:16-18')
    expect(targets).toHaveLength(3)
    expect(targets.map((t) => t.passageKey)).toEqual(['JHN.3.16', 'JHN.3.17', 'JHN.3.18'])
    expect(targets[0].language).toBe('grc')
  })

  it('wordStudyTargetFromReference returns first verse in range', () => {
    const t = wordStudyTargetFromReference('John 3:16-18')
    expect(t?.passageKey).toBe('JHN.3.16')
  })

  it('wordStudyAvailableFromReference is true for verse ranges', () => {
    expect(wordStudyAvailableFromReference('Romans 12:2-4')).toBe(true)
  })

  it('wordStudyTargetFromReference returns Hebrew for OT', () => {
    const t = wordStudyTargetFromReference('Genesis 1:1')
    expect(t?.passageKey).toBe('GEN.1.1')
    expect(t?.language).toBe('heb')
  })

  it('returns null for chapter-only reference', () => {
    expect(wordStudyTargetFromReference('Psalm 23')).toBeNull()
  })

  it('isAramaicVerse identifies biblical Aramaic passages', () => {
    expect(isAramaicVerse('DAN', 2, 3)).toBe(false)
    expect(isAramaicVerse('DAN', 2, 4)).toBe(true)
    expect(isAramaicVerse('DAN', 7, 28)).toBe(true)
    expect(isAramaicVerse('EZR', 4, 7)).toBe(false)
    expect(isAramaicVerse('EZR', 4, 8)).toBe(true)
    expect(isAramaicVerse('GEN', 1, 1)).toBe(false)
    expect(isAramaicVerse('GEN', 31, 47)).toBe(true)
  })

  it('wordStudyLanguageLabelFromReference returns Greek, Hebrew, or Aramaic', () => {
    expect(wordStudyLanguageLabelFromReference('2 Corinthians 13:14')).toBe('Greek')
    expect(wordStudyLanguageLabelFromReference('Genesis 1:1')).toBe('Hebrew')
    expect(wordStudyLanguageLabelFromReference('Daniel 2:4')).toBe('Aramaic')
    expect(wordStudyLanguageLabelFromReference('Psalm 23')).toBeNull()
  })
})
