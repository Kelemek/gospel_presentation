import { BIBLE_CANON_BOOKS_STATIC } from '@/lib/bibleCanonStatic'
import { parseReference, singleChapterBookVerseCount } from '@/lib/parse-scripture-reference'
import { normalizeScriptureReferenceString } from '@/lib/scriptureReferenceNormalize'
import type { BibleCanonTestament } from '@/lib/bibleCanonStatic'

export const SCRIPTURE_HIGHLIGHT_TESTAMENT_LABELS: Record<BibleCanonTestament, string> = {
  ot: 'Old Testament',
  nt: 'New Testament',
}

export interface ScriptureHighlightVerseRange {
  book: string
  chapter: number
  verseStart: number
  verseEnd: number
}

/** Canonical normalized reference, or null when unparseable. */
export function normalizeScriptureHighlightReference(ref: string): string | null {
  const trimmed = ref.trim()
  if (!trimmed) return null
  const normalized = normalizeScriptureReferenceString(trimmed)
  return parseReference(normalized) ? normalized : null
}

/** Storage key for a highlight: the tab reference (verse, range, or chapter-only), never chapter-expanded. */
export function scriptureHighlightStorageReference(tabReference: string): string | null {
  return normalizeScriptureHighlightReference(tabReference)
}

/** Old or New Testament for a saved scripture reference, or null when the book is unknown. */
export function scriptureHighlightTestament(ref: string): BibleCanonTestament | null {
  const normalized = normalizeScriptureHighlightReference(ref)
  if (!normalized) return null
  const parsed = parseReference(normalized)
  if (!parsed) return null
  const bookMeta = BIBLE_CANON_BOOKS_STATIC.find(
    (b) => b.name.toLowerCase() === parsed.book.trim().toLowerCase()
  )
  return bookMeta?.testament ?? null
}

export function scriptureHighlightVerseRange(ref: string): ScriptureHighlightVerseRange | null {
  const normalized = normalizeScriptureHighlightReference(ref)
  if (!normalized) return null
  const parsed = parseReference(normalized)
  if (!parsed) return null

  if (parsed.verseStart === null) {
    const singleChapterVerses = singleChapterBookVerseCount(parsed.book)
    if (singleChapterVerses != null) {
      return {
        book: parsed.book,
        chapter: parsed.chapter,
        verseStart: 1,
        verseEnd: singleChapterVerses,
      }
    }
    const bookMeta = BIBLE_CANON_BOOKS_STATIC.find(
      (b) => b.name.toLowerCase() === parsed.book.trim().toLowerCase()
    )
    if (!bookMeta) return null
    const versesInChapter = bookMeta.versesPerChapter[parsed.chapter - 1]
    if (!versesInChapter) return null
    return {
      book: parsed.book,
      chapter: parsed.chapter,
      verseStart: 1,
      verseEnd: versesInChapter,
    }
  }

  const verseStart = parsed.verseStart
  const verseEnd = parsed.verseEnd ?? parsed.verseStart
  return {
    book: parsed.book,
    chapter: parsed.chapter,
    verseStart,
    verseEnd,
  }
}

export function scriptureHighlightVerseNumbers(ref: string): number[] {
  const range = scriptureHighlightVerseRange(ref)
  if (!range) return []
  const verses: number[] = []
  for (let i = range.verseStart; i <= range.verseEnd; i++) {
    verses.push(i)
  }
  return verses
}

function rangesOverlap(
  a: ScriptureHighlightVerseRange,
  b: ScriptureHighlightVerseRange
): boolean {
  if (a.book.toLowerCase() !== b.book.toLowerCase() || a.chapter !== b.chapter) {
    return false
  }
  return a.verseStart <= b.verseEnd && b.verseStart <= a.verseEnd
}

/** True when saved highlight overlaps the passage currently being viewed. */
export function scriptureHighlightAppliesToView(savedRef: string, viewingRef: string): boolean {
  const saved = scriptureHighlightVerseRange(savedRef)
  const viewing = scriptureHighlightVerseRange(viewingRef)
  if (!saved || !viewing) return false
  return rangesOverlap(saved, viewing)
}
