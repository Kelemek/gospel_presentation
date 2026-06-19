import {
  maxVerseNumberInChapterText,
  verseCountForChapterReference,
} from '@/lib/chapterVerseCount'

describe('maxVerseNumberInChapterText', () => {
  it('returns 0 when there are no verse markers', () => {
    expect(maxVerseNumberInChapterText('')).toBe(0)
    expect(maxVerseNumberInChapterText('Plain text without markers')).toBe(0)
  })

  it('returns the highest [n] marker in the text', () => {
    expect(maxVerseNumberInChapterText('[1] In the beginning\n\n[2] And then')).toBe(2)
    expect(maxVerseNumberInChapterText('[15] Verse fifteen. [16] For God so loved.')).toBe(16)
  })
})

describe('verseCountForChapterReference', () => {
  it('uses canon verse counts for known chapter references', () => {
    expect(verseCountForChapterReference('Genesis 1')).toBe(31)
    expect(verseCountForChapterReference('John 3')).toBe(36)
  })

  it('prefers canon over chapter text when both are available', () => {
    expect(verseCountForChapterReference('Genesis 1', '[1] One\n\n[2] Two')).toBe(31)
  })

  it('falls back to the highest verse marker in loaded chapter text', () => {
    expect(verseCountForChapterReference('Unknown Book 1', '[1] A\n\n[5] E')).toBe(5)
  })

  it('returns 0 when the reference and text cannot be resolved', () => {
    expect(verseCountForChapterReference('not a reference')).toBe(0)
    expect(verseCountForChapterReference('Unknown Book 1')).toBe(0)
    expect(verseCountForChapterReference('Unknown Book 1', 'No verse markers here')).toBe(0)
  })
})
