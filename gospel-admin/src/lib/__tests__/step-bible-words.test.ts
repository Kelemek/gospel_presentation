import { enrichStepBibleWord } from '@/lib/step-bible-words'
import { lookupLexicon } from '@/lib/step-bible-lexicon'

describe('enrichStepBibleWord', () => {
  it('fills Hebrew transliteration from TBESH when missing on disk', () => {
    const w = enrichStepBibleWord({
      position: 7,
      text: 'הָ/אֱלֹהִים',
      strongs: 'H9009/{H0430G}',
      gloss: '[is] <the>/ God',
    })
    expect(w.gloss).toBe('[is] <the>/ God')
    expect(w.strongs).toBe('H9009/{H0430G}')
    expect(w.transliteration).toBe(lookupLexicon('H430', 'brief')?.transliteration)
  })

  it('replaces morphology mistaken for gloss with TBESH gloss', () => {
    const w = enrichStepBibleWord({
      position: 1,
      text: 'אַתָּה',
      transliteration: "'a.Tah",
      strongs: 'H859',
      gloss: 'HPp2ms',
    })
    expect(w.morph).toBe('HPp2ms')
    expect(w.gloss).not.toBe('HPp2ms')
    expect(w.gloss).toBeTruthy()
  })

  it('fixes swapped strongs/gloss then enriches', () => {
    const w = enrichStepBibleWord({
      position: 1,
      text: 'אַתָּה',
      strongs: 'you',
      gloss: '{H0859A}',
    })
    expect(w.strongs).toBe('{H0859A}')
    expect(w.gloss).toBe('you')
    expect(w.transliteration).toBeTruthy()
  })
})
