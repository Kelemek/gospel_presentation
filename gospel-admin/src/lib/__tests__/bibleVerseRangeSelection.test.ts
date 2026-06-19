import {
  EMPTY_VERSE_RANGE_SELECTION,
  formatVerseRangeSelectionLabel,
  isVerseInRange,
  nextVerseRangeSelection,
  verseNumbersInRange,
} from '@/lib/bibleVerseRangeSelection'

describe('bibleVerseRangeSelection', () => {
  it('selects start, then range, then resets on third tap', () => {
    let sel = EMPTY_VERSE_RANGE_SELECTION
    sel = nextVerseRangeSelection(sel, 3)
    expect(sel).toEqual({ verseStart: 3, verseEnd: null })
    sel = nextVerseRangeSelection(sel, 7)
    expect(sel).toEqual({ verseStart: 3, verseEnd: 7 })
    sel = nextVerseRangeSelection(sel, 2)
    expect(sel).toEqual({ verseStart: 2, verseEnd: null })
  })

  it('marks verses in range', () => {
    const sel = { verseStart: 3, verseEnd: 5 }
    expect(isVerseInRange(2, sel)).toBe(false)
    expect(isVerseInRange(4, sel)).toBe(true)
    expect(verseNumbersInRange(sel)).toEqual([3, 4, 5])
    expect(formatVerseRangeSelectionLabel(sel)).toBe('Verses 3–5')
    expect(formatVerseRangeSelectionLabel({ verseStart: 4, verseEnd: null })).toBe('Verse 4')
  })
})
