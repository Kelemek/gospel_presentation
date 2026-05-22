import {
  bookChapterFromCommentarySubsectionTitle,
  commentarySubsectionTitleMatchesChapter,
  lookupBookChapterFromReference,
} from '@/lib/studyCommentaryChapterTitleMatch'

describe('studyCommentaryChapterTitleMatch', () => {
  it('parses lookup reference to USFM book and chapter', () => {
    expect(lookupBookChapterFromReference('Romans 8:28')).toEqual({ usfm: 'ROM', chapter: 8 })
    expect(lookupBookChapterFromReference('Psalm 51:3')).toEqual({ usfm: 'PSA', chapter: 51 })
  })

  it('parses Henry and Calvin chapter-style subsection titles', () => {
    expect(bookChapterFromCommentarySubsectionTitle('Genesis — Chapter 8')).toEqual({
      usfm: 'GEN',
      chapter: 8,
    })
    expect(bookChapterFromCommentarySubsectionTitle('Psalm 51')).toEqual({
      usfm: 'PSA',
      chapter: 51,
    })
    expect(bookChapterFromCommentarySubsectionTitle('Romans — Chapter 12 — Romans 12:4-8')).toEqual({
      usfm: 'ROM',
      chapter: 12,
    })
    expect(bookChapterFromCommentarySubsectionTitle('Romans 8')).toEqual({
      usfm: 'ROM',
      chapter: 8,
    })
    expect(bookChapterFromCommentarySubsectionTitle('Romans 12:4-8')).toBeNull()
  })

  it('matches verse lookup to chapter-level commentary titles', () => {
    expect(
      commentarySubsectionTitleMatchesChapter('Romans — Chapter 8', 'Romans 8:28')
    ).toBe(true)
    expect(commentarySubsectionTitleMatchesChapter('Psalm 51', 'Psalms 51:1')).toBe(true)
    expect(
      commentarySubsectionTitleMatchesChapter('Genesis — Chapter 1', 'Romans 8:28')
    ).toBe(false)
  })
})
