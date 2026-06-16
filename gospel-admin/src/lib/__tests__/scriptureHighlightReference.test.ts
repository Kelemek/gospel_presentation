import {
  normalizeScriptureHighlightReference,
  scriptureHighlightAppliesToView,
  scriptureHighlightStorageReference,
  scriptureHighlightTestament,
  scriptureHighlightVerseNumbers,
  scriptureHighlightVerseRange,
} from '@/lib/scriptureHighlightReference'

describe('scriptureHighlightReference', () => {
  it('normalizes references', () => {
    expect(normalizeScriptureHighlightReference('John 3:16')).toBe('John 3:16')
    expect(normalizeScriptureHighlightReference('')).toBeNull()
  })

  it('returns verse numbers for ranges', () => {
    expect(scriptureHighlightVerseNumbers('Romans 8:28-30')).toEqual([28, 29, 30])
    expect(scriptureHighlightVerseNumbers('John 3:16')).toEqual([16])
  })

  it('chapter-only refs span the whole chapter', () => {
    const range = scriptureHighlightVerseRange('John 3')
    expect(range).not.toBeNull()
    expect(range!.verseStart).toBe(1)
    expect(range!.verseEnd).toBeGreaterThan(30)
  })

  it('scriptureHighlightAppliesToView detects overlap', () => {
    expect(scriptureHighlightAppliesToView('Romans 8:28-30', 'Romans 8:28')).toBe(true)
    expect(scriptureHighlightAppliesToView('Romans 8:28-30', 'Romans 8:31')).toBe(false)
    expect(scriptureHighlightAppliesToView('Romans 8:28', 'Romans 8')).toBe(true)
  })

  it('scriptureHighlightStorageReference keeps tab scope', () => {
    expect(scriptureHighlightStorageReference('Mark 2:3')).toBe('Mark 2:3')
    expect(scriptureHighlightStorageReference('Romans 8')).toBe('Romans 8')
  })

  it('scriptureHighlightTestament resolves OT and NT books', () => {
    expect(scriptureHighlightTestament('Psalm 24:1')).toBe('ot')
    expect(scriptureHighlightTestament('John 3:16')).toBe('nt')
    expect(scriptureHighlightTestament('')).toBeNull()
  })
})
