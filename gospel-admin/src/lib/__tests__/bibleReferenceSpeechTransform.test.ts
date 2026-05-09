import {
  buildBibleReferenceSpeakChunk,
  displayCharIndexInChunkForSpeakIndex,
  displayCharRangeInChunkForSpeakRange,
} from '@/lib/bibleReferenceSpeechTransform'

describe('buildBibleReferenceSpeakChunk', () => {
  it('leaves prose without chapter:verse unchanged (identity map)', () => {
    const s = 'Hello world.'
    const r = buildBibleReferenceSpeakChunk(s)
    expect(r.speakText).toBe(s)
    expect(r.speakCharToDisplayCharIndex).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
  })

  it('expands chapter:verse with verse word and maps speak chars to display indices', () => {
    const d = 'See John 3:16 today.'
    const r = buildBibleReferenceSpeakChunk(d)
    expect(r.speakText).toContain('3 verse 16')
    expect(r.speakText).not.toContain('3:16')
    const idx3 = r.speakText.indexOf('3')
    const idxVerse = r.speakText.indexOf('verse')
    expect(r.speakCharToDisplayCharIndex[idx3]).toBe(d.indexOf('3'))
    expect(r.speakCharToDisplayCharIndex[idxVerse]).toBe(d.indexOf(':'))
  })

  it('expands chapter:verse-verse ranges with " to " and verse digits', () => {
    const d = 'Psalm 23:1-3 here.'
    const r = buildBibleReferenceSpeakChunk(d)
    expect(r.speakText).toContain('23 verse 1 to 3')
    expect(r.speakText).not.toContain('23:1')
    expect(r.speakText).not.toContain('-')
  })

  it('speaks 24:24-25 as verse digits with " to " (no spoken dash)', () => {
    const d = 'Isaiah 24:24-25.'
    const r = buildBibleReferenceSpeakChunk(d)
    expect(r.speakText).toContain('24 verse 24 to 25')
    expect(r.speakText).not.toContain('24-25')
  })

  it('treats en dash like hyphen in chapter:verse ranges', () => {
    const d = 'Isaiah 24:24–25.' // U+2013 en dash
    const r = buildBibleReferenceSpeakChunk(d)
    expect(r.speakText).toContain('24 verse 24 to 25')
    expect(r.speakText).not.toContain('\u2013')
  })

  it('handles partial verse suffix on range end (6-7a)', () => {
    const d = 'Isaiah 44:6-7a.'
    const r = buildBibleReferenceSpeakChunk(d)
    expect(r.speakText).toContain('44 verse 6 to 7a')
    expect(r.speakText).not.toContain('6-7')
  })

  it('speaks numbered books with first/second/third', () => {
    const d = 'See 2 Corinthians 3:16 and 1 Thessalonians 4:13.'
    const r = buildBibleReferenceSpeakChunk(d)
    expect(r.speakText).toContain('second Corinthians')
    expect(r.speakText).toContain('first Thessalonians')
    expect(r.speakText).not.toMatch(/\b2 Corinthians\b/)
    expect(r.speakText).not.toMatch(/\b1 Thessalonians\b/)
    expect(r.speakText).toContain('3 verse 16')
    expect(r.speakText).toContain('4 verse 13')
  })

  it('uses third for 3 John before a reference', () => {
    const d = 'Read 3 John 1:4 for joy.'
    const r = buildBibleReferenceSpeakChunk(d)
    expect(r.speakText).toContain('third John')
    expect(r.speakText).toContain('1 verse 4')
  })
})

describe('displayCharIndexInChunkForSpeakIndex', () => {
  it('clamps speak index to mapping length', () => {
    const d = 'A 1:2 B'
    const { speakText, speakCharToDisplayCharIndex } = buildBibleReferenceSpeakChunk(d)
    expect(displayCharIndexInChunkForSpeakIndex(speakText.length + 99, speakCharToDisplayCharIndex, d.length)).toBeLessThan(
      d.length
    )
  })
})

describe('displayCharRangeInChunkForSpeakRange', () => {
  it('maps a speak word span to display span', () => {
    const d = 'Text John 3:16 end'
    const { speakText, speakCharToDisplayCharIndex } = buildBibleReferenceSpeakChunk(d)
    const vs = speakText.indexOf('verse')
    const range = displayCharRangeInChunkForSpeakRange(vs, vs + 5, speakCharToDisplayCharIndex, d.length)
    expect(range.displayStart).toBe(d.indexOf(':'))
    expect(range.displayEndExclusive).toBeGreaterThan(range.displayStart)
  })
})
