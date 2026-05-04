/**
 * Overlap between a scripture modal passage key (USFM-style) and rows in
 * {@code spurgeon_passage_index} (single verse, same-chapter range, or chapter-only).
 *
 * Same-chapter API.Bible-style keys only (e.g. {@code PHP.2.3}, {@code PHP.2.1-PHP.2.5}).
 * Cross-chapter keys are not parsed here; they only match on exact string equality.
 */

/** Max verse count in a single chapter (Psalm 119) — used for chapter-only keys. */
const CHAPTER_VERSE_CAP = 176

export type SpurgeonChapterVerseSpan = { book: string; chapter: number; lo: number; hi: number }

const SAME_CHAPTER_RANGE_KEY_RE = /^([A-Z0-9]+)\.(\d+)\.(\d+)-\1\.\2\.(\d+)$/

/**
 * Parse supported USFM passage keys into a verse span within one chapter.
 * Returns null for unsupported shapes (e.g. cross-chapter ranges).
 */
export function parseUsfmPassageKeyToSpan(key: string): SpurgeonChapterVerseSpan | null {
  const t = key.trim()
  if (!t) return null

  const range = t.match(SAME_CHAPTER_RANGE_KEY_RE)
  if (range) {
    const ch = parseInt(range[2], 10)
    const v1 = parseInt(range[3], 10)
    const v2 = parseInt(range[4], 10)
    if (!Number.isFinite(ch) || !Number.isFinite(v1) || !Number.isFinite(v2)) return null
    const lo = Math.min(v1, v2)
    const hi = Math.max(v1, v2)
    return { book: range[1], chapter: ch, lo, hi }
  }

  const single = t.match(/^([A-Z0-9]+)\.(\d+)\.(\d+)$/)
  if (single) {
    const ch = parseInt(single[2], 10)
    const v = parseInt(single[3], 10)
    if (!Number.isFinite(ch) || !Number.isFinite(v)) return null
    return { book: single[1], chapter: ch, lo: v, hi: v }
  }

  const chapOnly = t.match(/^([A-Z0-9]+)\.(\d+)$/)
  if (chapOnly) {
    const ch = parseInt(chapOnly[2], 10)
    if (!Number.isFinite(ch)) return null
    return { book: chapOnly[1], chapter: ch, lo: 1, hi: CHAPTER_VERSE_CAP }
  }

  return null
}

/** True when the two keys denote overlapping verse coverage in the same chapter. */
export function spurgeonPassageKeySpansOverlap(lookupKey: string, indexKey: string): boolean {
  const a = lookupKey.trim()
  const b = indexKey.trim()
  if (!a || !b) return false
  if (a === b) return true

  const A = parseUsfmPassageKeyToSpan(a)
  const B = parseUsfmPassageKeyToSpan(b)
  if (!A || !B) return false
  if (A.book !== B.book || A.chapter !== B.chapter) return false
  return A.lo <= B.hi && B.lo <= A.hi
}

/**
 * PostgREST {@code .or(...)} filter for same-book-chapter index rows: exact chapter key or any verse/range key in that chapter.
 * Returns null when {@code passageKey} does not start with {@code BOOK.chapter}.
 */
export function spurgeonPassageIndexBroadOrFilter(passageKey: string): string | null {
  const m = passageKey.trim().match(/^([A-Z0-9]+)\.(\d+)/)
  if (!m) return null
  const book = m[1]
  const chapter = m[2]
  const chapterExact = `${book}.${chapter}`
  const likePattern = `${book}.${chapter}.%`
  return `passage_key.eq.${chapterExact},passage_key.like.${likePattern}`
}
