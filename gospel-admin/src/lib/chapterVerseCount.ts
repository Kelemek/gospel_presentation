import { memorizeAddBookFromReference } from '@/lib/memorizationAddVersePrefs'
import { parseReference } from '@/lib/parse-scripture-reference'

export function maxVerseNumberInChapterText(text: string): number {
  let max = 0
  for (const m of text.matchAll(/\[(\d+)\]/g)) {
    const n = Number(m[1])
    if (Number.isFinite(n)) max = Math.max(max, n)
  }
  return max
}

/** Verse count for a chapter reference; falls back to markers in loaded chapter HTML. */
export function verseCountForChapterReference(
  chapterReference: string,
  chapterText?: string
): number {
  const book = memorizeAddBookFromReference(chapterReference)
  const parsed = parseReference(chapterReference.trim())
  if (book && parsed) {
    const ch = book.chapters.find((c) => parseInt(c.number, 10) === parsed.chapter)
    if (typeof ch?.verseCount === 'number' && ch.verseCount > 0) return ch.verseCount
  }
  if (chapterText) {
    const fromText = maxVerseNumberInChapterText(chapterText)
    if (fromText > 0) return fromText
  }
  return 0
}
