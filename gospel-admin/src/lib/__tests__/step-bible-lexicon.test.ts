import { lookupLexicon } from '@/lib/step-bible-lexicon'

describe('step-bible-lexicon', () => {
  it('returns Hebrew TBESH brief entry for H430', () => {
    const entry = lookupLexicon('H430', 'brief')
    expect(entry).not.toBeNull()
    expect(entry?.language).toBe('heb')
    expect(entry?.source).toBe('TBESH')
    expect(entry?.gloss).toBeTruthy()
  })

  it('notes when full Hebrew is requested', () => {
    const entry = lookupLexicon('H430', 'full')
    expect(entry?.detail).toBe('full')
    expect(entry?.note).toMatch(/BDB/i)
    expect(entry?.source).toBe('TBESH')
  })
})
