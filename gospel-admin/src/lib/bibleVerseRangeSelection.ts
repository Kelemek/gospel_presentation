export type VerseRangeSelection = {
  verseStart: number | null
  verseEnd: number | null
}

export const EMPTY_VERSE_RANGE_SELECTION: VerseRangeSelection = {
  verseStart: null,
  verseEnd: null,
}

/** Same tap logic as {@link BiblePassagePickerModal} verse grid. */
export function nextVerseRangeSelection(
  current: VerseRangeSelection,
  verse: number
): VerseRangeSelection {
  const { verseStart, verseEnd } = current
  if (verseStart === null) {
    return { verseStart: verse, verseEnd: null }
  }
  if (verseEnd === null) {
    if (verse === verseStart) return current
    return {
      verseStart: Math.min(verse, verseStart),
      verseEnd: Math.max(verse, verseStart),
    }
  }
  return { verseStart: verse, verseEnd: null }
}

export function isVerseInRange(n: number, selection: VerseRangeSelection): boolean {
  const { verseStart, verseEnd } = selection
  if (verseStart === null) return false
  if (verseEnd === null) return n === verseStart
  const lo = Math.min(verseStart, verseEnd)
  const hi = Math.max(verseStart, verseEnd)
  return n >= lo && n <= hi
}

export function verseNumbersInRange(selection: VerseRangeSelection): number[] {
  const { verseStart, verseEnd } = selection
  if (verseStart === null) return []
  const end = verseEnd ?? verseStart
  const lo = Math.min(verseStart, end)
  const hi = Math.max(verseStart, end)
  const out: number[] = []
  for (let v = lo; v <= hi; v++) out.push(v)
  return out
}

export function formatVerseRangeSelectionLabel(selection: VerseRangeSelection): string | null {
  const { verseStart, verseEnd } = selection
  if (verseStart === null) return null
  if (verseEnd === null || verseEnd === verseStart) return `Verse ${verseStart}`
  const lo = Math.min(verseStart, verseEnd)
  const hi = Math.max(verseStart, verseEnd)
  return `Verses ${lo}–${hi}`
}
