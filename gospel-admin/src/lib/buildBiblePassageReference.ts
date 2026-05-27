import { referenceBookNameFromApiBook } from '@/lib/bibleReferenceBookName'

/**
 * Builds a human-readable scripture reference from picker selection.
 * When verseStart is null, returns a chapter-only reference (e.g. "Genesis 1").
 */
export function buildBiblePassageReference(
  bookId: string,
  bookName: string,
  chapterNum: number,
  verseStart: number | null,
  verseEnd: number | null
): string {
  const book = referenceBookNameFromApiBook(bookId, bookName)
  if (verseStart === null) {
    return `${book} ${chapterNum}`
  }
  if (verseEnd === null || verseEnd === verseStart) {
    return `${book} ${chapterNum}:${verseStart}`
  }
  const a = Math.min(verseStart, verseEnd)
  const b = Math.max(verseStart, verseEnd)
  return `${book} ${chapterNum}:${a}-${b}`
}
