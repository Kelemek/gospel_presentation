import {
  CANONICAL_BIBLE_USFM_ORDER,
  canonOrderIndexForUsfm,
  normalizeCalvinBookUsfm,
} from '@/lib/calvin/calvinUsfmNormalize'

describe('normalizeCalvinBookUsfm', () => {
  it('maps common CCEL OSIS abbreviations to canonical USFM', () => {
    expect(normalizeCalvinBookUsfm('Exod')).toBe('EXO')
    expect(normalizeCalvinBookUsfm('DEUT')).toBe('DEU')
    expect(normalizeCalvinBookUsfm('Ps')).toBe('PSA')
    expect(normalizeCalvinBookUsfm('JOHN')).toBe('JHN')
    expect(normalizeCalvinBookUsfm('Matt')).toBe('MAT')
    expect(normalizeCalvinBookUsfm('Acts')).toBe('ACT')
    expect(normalizeCalvinBookUsfm('1Cor')).toBe('1CO')
    expect(normalizeCalvinBookUsfm('1John')).toBe('1JN')
    expect(normalizeCalvinBookUsfm('2Kgs')).toBe('2KI')
    expect(normalizeCalvinBookUsfm('Nah')).toBe('NAM')
  })

  it('passes through canonical codes', () => {
    expect(normalizeCalvinBookUsfm('GEN')).toBe('GEN')
    expect(normalizeCalvinBookUsfm('ROM')).toBe('ROM')
  })

  it('returns null for unknown codes', () => {
    expect(normalizeCalvinBookUsfm('ZZZ')).toBeNull()
  })
})

describe('canon order', () => {
  it('orders Genesis before Revelation', () => {
    expect(canonOrderIndexForUsfm('GEN')).toBeLessThan(canonOrderIndexForUsfm('REV'))
    expect(CANONICAL_BIBLE_USFM_ORDER[0]).toBe('GEN')
    expect(CANONICAL_BIBLE_USFM_ORDER[CANONICAL_BIBLE_USFM_ORDER.length - 1]).toBe('REV')
  })
})
