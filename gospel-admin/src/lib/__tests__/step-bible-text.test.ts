import {
  hebrewLexiconLookupKeys,
  looksLikeHebrewMorphCode,
  looksLikeStepStrongsField,
  formatStrongsChipLabel,
  normalizeStepBibleWordFields,
  normalizeStrongsForLookup,
  parseDictionaryGloss,
  parseStrongsAndMorph,
  parseSurfaceAndTransliteration,
  stripStepBibleMarkup,
} from '@/lib/step-bible-text'

describe('step-bible-text', () => {
  it('parses Greek surface and transliteration', () => {
    expect(parseSurfaceAndTransliteration('καὶ (kai)')).toEqual({
      text: 'καὶ',
      transliteration: 'kai',
    })
  })

  it('parses Strong and morph from dStrongs', () => {
    expect(parseStrongsAndMorph('G3339=V-PPM-2P')).toEqual({
      strongs: 'G3339',
      morph: 'V-PPM-2P',
    })
  })

  it('parses Hebrew Strong from compound field', () => {
    expect(parseStrongsAndMorph('H9002/H9009/{H0776G}')).toEqual({ strongs: 'H776' })
  })

  it('normalizeStrongsForLookup prefers braced lemma in compound Hebrew field', () => {
    expect(normalizeStrongsForLookup('H9002/{H6186A}/H9034')).toEqual({
      language: 'heb',
      key: 'H6186',
    })
    expect(normalizeStrongsForLookup('H9002/{H0413}\\H9014')).toEqual({
      language: 'heb',
      key: 'H413',
    })
  })

  it('hebrewLexiconLookupKeys lists braced lemma before morphology codes', () => {
    expect(hebrewLexiconLookupKeys('H9002/{H0413}\\H9014')[0]).toBe('H413')
  })

  it('looksLikeHebrewMorphCode detects TAHOT morphology tags', () => {
    expect(looksLikeHebrewMorphCode('HPp2ms')).toBe(true)
    expect(looksLikeHebrewMorphCode('HR/Vqcc')).toBe(true)
    expect(looksLikeHebrewMorphCode('you')).toBe(false)
    expect(looksLikeHebrewMorphCode('[is] <the>/ God')).toBe(false)
  })

  it('looksLikeStepStrongsField detects dStrongs tokens', () => {
    expect(looksLikeStepStrongsField('{H0859A}')).toBe(true)
    expect(looksLikeStepStrongsField('you')).toBe(false)
    expect(looksLikeStepStrongsField('G3339')).toBe(true)
  })

  it('formatStrongsChipLabel prefers normalized key with full dStrongs in title', () => {
    expect(formatStrongsChipLabel('H9009/{H0430G}')).toEqual({
      primary: 'H430',
      title: 'H9009/{H0430G}',
    })
    expect(formatStrongsChipLabel('G3100')).toEqual({ primary: 'G3100' })
  })

  it('normalizeStepBibleWordFields swaps swapped Hebrew import rows', () => {
    expect(
      normalizeStepBibleWordFields({
        position: 1,
        text: 'אַתָּה',
        strongs: 'you',
        gloss: '{H0859A}',
      })
    ).toEqual({
      position: 1,
      text: 'אַתָּה',
      strongs: '{H0859A}',
      gloss: 'you',
    })
  })

  it('strips HTML from definitions', () => {
    expect(stripStepBibleMarkup('<b>foo</b><br />bar')).toBe('foo\nbar')
  })

  it('strips STEPBible outline underscores and refs', () => {
    const raw =
      "<b>ἀρχή</b>, -ῆς, ἡ <BR />__1. <b>beginning, origin</b>; __(a) absol., νείκεος ἀ.[Refs 8th c.BC+]; <ref='Rev.21.6'>Rev.21:6</ref>"
    const out = stripStepBibleMarkup(raw)
    expect(out).not.toMatch(/__/)
    expect(out).not.toContain('[Refs')
    expect(out).toContain('Rev 21 6')
    expect(out).toContain('1. beginning, origin')
    expect(out).toContain('(a) absol.')
  })

  it('preserves Roman outline markers from STEPBible underscores', () => {
    const out = stripStepBibleMarkup('__I active; __I.2 of things; __II passive')
    expect(out).toContain('I active')
    expect(out).toContain('I.2 of things')
    expect(out).toContain('II passive')
  })

  it('removes empty brackets after apparatus links (TFLSJ)', () => {
    const raw =
      '<b>-σω</b>[<a href="javascript:void(0)" title="5th c.BC: Euripides">Refs 5th c.BC+</a>]<i>aorist</i> ἐπόρευσα, πόρευσα [<a href="#">Refs</a>]:—'
    const out = stripStepBibleMarkup(raw)
    expect(out).not.toContain('[]')
    expect(out).toContain('-σω')
    expect(out).toContain('aorist')
    expect(out).toContain('ἐπόρευσα')
  })

  it('parses dictionary gloss', () => {
    expect(parseDictionaryGloss('μεταμορφόω=to transform')).toEqual({
      lemma: 'μεταμορφόω',
      gloss: 'to transform',
    })
  })
})
