import { bookNameToUsfm, canonicalScriptureCacheReference } from '@/lib/api-bible-passage-id'
import { BIBLE_CANON_BOOKS_STATIC } from '@/lib/bibleCanonStatic'
import {
  isGospelCanonicalScriptureRef,
  normalizeScriptureReferenceString,
} from '@/lib/scriptureReferenceNormalize'

/** Pre-normalize quirks in the M'Cheyne source schedule before canonical normalization. */
export function preprocessMcheyneReference(raw: string): string {
  let s = raw.replace(/\s+/g, ' ').trim()
  s = s.replace(/\s*&\s*/g, '-')
  s = s.replace(/(\d):(\d+)ff\b/i, '$1:$2')
  s = s.replace(/(\d):(\d+)f\b/i, '$1:$2')
  return s
}

export function isAcceptableMcheyneReference(ref: string): boolean {
  if (isGospelCanonicalScriptureRef(ref)) return true
  return Boolean(canonicalScriptureCacheReference(ref))
}

export function normalizeMcheyneReference(raw: string): string {
  const pre = preprocessMcheyneReference(raw)
  const norm = normalizeScriptureReferenceString(pre)
  if (isAcceptableMcheyneReference(norm)) return norm
  if (isAcceptableMcheyneReference(pre)) return pre
  throw new Error(`Could not normalize M'Cheyne reference: ${JSON.stringify(raw)}`)
}

function lastVerseOfChapter(bookName: string, chapter: number): number | null {
  const usfm = bookNameToUsfm(bookName)
  if (!usfm) return null
  const canon = BIBLE_CANON_BOOKS_STATIC.find((b) => b.id === usfm)
  if (!canon || chapter < 1 || chapter > canon.versesPerChapter.length) return null
  return canon.versesPerChapter[chapter - 1] ?? null
}

function verseRangeRef(
  book: string,
  chapter: number,
  verseStart: number,
  verseEnd: number
): string {
  if (verseStart === verseEnd) return `${book} ${chapter}:${verseStart}`
  return `${book} ${chapter}:${verseStart}-${verseEnd}`
}

/** `Exodus 11-12:21` → full start chapter + verses through end of last chapter. */
function expandCrossChapterThroughVerse(
  book: string,
  startChapter: number,
  endChapter: number,
  endVerse: number
): string[] | null {
  if (endChapter <= startChapter || endChapter - startChapter > 120) return null
  if (endVerse < 1) return null

  const cards: string[] = [`${book} ${startChapter}`]
  for (let ch = startChapter + 1; ch < endChapter; ch++) {
    cards.push(`${book} ${ch}`)
  }
  cards.push(verseRangeRef(book, endChapter, 1, endVerse))
  return cards
}

/** `Isaiah 9:8-10:4` → tail of start chapter + full middle chapters + verses in end chapter. */
function expandCrossChapterVerseSpan(
  book: string,
  startChapter: number,
  startVerse: number,
  endChapter: number,
  endVerse: number
): string[] | null {
  if (endChapter <= startChapter || endChapter - startChapter > 120) return null
  if (startVerse < 1 || endVerse < 1) return null

  const cards: string[] = []
  const startLast = lastVerseOfChapter(book, startChapter)
  if (startLast != null && startVerse <= startLast) {
    if (startVerse === startLast) {
      cards.push(`${book} ${startChapter}:${startVerse}`)
    } else {
      cards.push(verseRangeRef(book, startChapter, startVerse, startLast))
    }
  } else {
    cards.push(verseRangeRef(book, startChapter, startVerse, startVerse))
  }

  for (let ch = startChapter + 1; ch < endChapter; ch++) {
    cards.push(`${book} ${ch}`)
  }

  cards.push(verseRangeRef(book, endChapter, 1, endVerse))
  return cards
}

/**
 * Split multi-chapter readings into one card per chapter (or verse span within a chapter).
 * Same-chapter refs (`Luke 1:1-38`, `Judges 11:12`) stay a single card.
 */
export function expandMcheyneReadingToChapterCards(reference: string): string[] {
  const trimmed = reference.trim()
  const normalized = trimmed.replace(/–/g, '-')

  const crossVerseSpan = /^(.+?)\s+(\d+):(\d+)\s*-\s*(\d+):(\d+)$/.exec(normalized)
  if (crossVerseSpan) {
    const expanded = expandCrossChapterVerseSpan(
      crossVerseSpan[1].trim(),
      parseInt(crossVerseSpan[2], 10),
      parseInt(crossVerseSpan[3], 10),
      parseInt(crossVerseSpan[4], 10),
      parseInt(crossVerseSpan[5], 10)
    )
    if (expanded) return expanded
  }

  const crossThroughVerse = /^(.+?)\s+(\d+)\s*-\s*(\d+):(\d+)$/.exec(normalized)
  if (crossThroughVerse) {
    const expanded = expandCrossChapterThroughVerse(
      crossThroughVerse[1].trim(),
      parseInt(crossThroughVerse[2], 10),
      parseInt(crossThroughVerse[3], 10),
      parseInt(crossThroughVerse[4], 10)
    )
    if (expanded) return expanded
  }

  if (!normalized.includes(':')) {
    const chapterRange = /^(.+?)\s+(\d+)\s*-\s*(\d+)$/.exec(normalized)
    if (chapterRange) {
      const book = chapterRange[1].trim()
      const start = parseInt(chapterRange[2], 10)
      const end = parseInt(chapterRange[3], 10)
      if (Number.isFinite(start) && Number.isFinite(end) && end >= start && end - start <= 120) {
        return Array.from({ length: end - start + 1 }, (_, i) => `${book} ${start + i}`)
      }
    }
  }

  return [trimmed]
}
