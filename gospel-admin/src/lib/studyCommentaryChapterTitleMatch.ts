import { bookNameToUsfm, canonicalScriptureCacheReference } from '@/lib/api-bible-passage-id'
import { normalizeCalvinBookUsfm } from '@/lib/calvin/calvinUsfmNormalize'
import { parseReference } from '@/lib/parse-scripture-reference'
import { parseUsfmPassageKeyToSpan } from '@/lib/spurgeon/spurgeonPassageKeyMatch'

/** USFM book + chapter from a user/scripture-modal reference (e.g. `Romans 8:28` → ROM, 8). */
export function lookupBookChapterFromReference(reference: string): {
  usfm: string
  chapter: number
} | null {
  const key = canonicalScriptureCacheReference(reference.trim())
  const span = parseUsfmPassageKeyToSpan(key)
  if (!span) return null
  return { usfm: span.book, chapter: span.chapter }
}

/**
 * Book + chapter from Matthew Henry / Calvin subsection titles that denote a whole chapter
 * (`Genesis — Chapter 8`, `Psalm 51`, `Romans 12:4-8`, `Romans — Chapter 12 — unit`).
 */
export function bookChapterFromCommentarySubsectionTitle(title: string): {
  usfm: string
  chapter: number
} | null {
  const t = title.trim()
  if (!t) return null

  const psalm = /^Psalm\s+(\d+)\s*$/i.exec(t)
  if (psalm) {
    const chapter = parseInt(psalm[1], 10)
    if (Number.isFinite(chapter)) return { usfm: 'PSA', chapter }
  }

  const chapterHeading = /^(.+?)\s+—\s+Chapter\s+(\d+)\b/i.exec(t)
  if (chapterHeading) {
    const rawBook = chapterHeading[1].trim()
    const usfm = bookNameToUsfm(rawBook)
    if (usfm) {
      const chapter = parseInt(chapterHeading[2], 10)
      if (Number.isFinite(chapter)) {
        return { usfm: normalizeCalvinBookUsfm(usfm) ?? usfm, chapter }
      }
    }
  }

  const parsed = parseReference(t)
  if (parsed && parsed.verseStart === null) {
    const usfm = bookNameToUsfm(parsed.book)
    if (usfm) {
      return {
        usfm: normalizeCalvinBookUsfm(usfm) ?? usfm,
        chapter: parsed.chapter,
      }
    }
  }

  return null
}

/** True when a commentary subsection title denotes the same canonical chapter as the lookup reference. */
export function commentarySubsectionTitleMatchesChapter(
  subsectionTitle: string,
  lookupReference: string
): boolean {
  const lookup = lookupBookChapterFromReference(lookupReference)
  const fromTitle = bookChapterFromCommentarySubsectionTitle(subsectionTitle)
  if (!lookup || !fromTitle) return false
  return lookup.usfm === fromTitle.usfm && lookup.chapter === fromTitle.chapter
}
