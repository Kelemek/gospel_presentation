import { bookNameToUsfm } from '@/lib/api-bible-passage-id'
import { BIBLE_CANON_BOOKS_STATIC } from '@/lib/bibleCanonStatic'
import { referenceBookNameFromApiBook } from '@/lib/bibleReferenceBookName'
import { buildBiblePassageReference } from '@/lib/buildBiblePassageReference'
import { parseReference } from '@/lib/parse-scripture-reference'

export type AdjacentPickerPassage = {
  reference: string
  initialChapterView: boolean
}

function canonBookForReference(reference: string) {
  const parsed = parseReference(reference.trim())
  if (!parsed) return null
  const usfm = bookNameToUsfm(parsed.book)
  if (!usfm) return null
  const book = BIBLE_CANON_BOOKS_STATIC.find((b) => b.id === usfm)
  if (!book) return null
  return { parsed, book }
}

function formatChapterRef(bookId: string, bookName: string, chapter: number): string {
  return buildBiblePassageReference(bookId, bookName, chapter, null, null)
}

function formatVerseRef(
  bookId: string,
  bookName: string,
  chapter: number,
  verse: number
): string {
  return buildBiblePassageReference(bookId, bookName, chapter, verse, null)
}

/**
 * Previous/next passage when the reader opened scripture via the passage picker
 * (Bible Reader or header reference). Stays within the current book.
 */
export function adjacentPickerPassage(
  reference: string,
  direction: 'prev' | 'next'
): AdjacentPickerPassage | null {
  const resolved = canonBookForReference(reference)
  if (!resolved) return null
  const { parsed, book } = resolved
  const displayName = referenceBookNameFromApiBook(book.id, book.name)
  const chapterCount = book.versesPerChapter.length

  if (parsed.verseStart === null) {
    const targetChapter = direction === 'next' ? parsed.chapter + 1 : parsed.chapter - 1
    if (targetChapter < 1 || targetChapter > chapterCount) return null
    return {
      reference: formatChapterRef(book.id, displayName, targetChapter),
      initialChapterView: true,
    }
  }

  const rangeEnd = parsed.verseEnd ?? parsed.verseStart
  const anchorVerse = direction === 'next' ? rangeEnd : parsed.verseStart
  const chapterIndex = parsed.chapter - 1
  const versesInChapter = book.versesPerChapter[chapterIndex]
  if (versesInChapter == null || anchorVerse == null) return null

  if (direction === 'next') {
    if (anchorVerse < versesInChapter) {
      return {
        reference: formatVerseRef(book.id, displayName, parsed.chapter, anchorVerse + 1),
        initialChapterView: false,
      }
    }
    if (parsed.chapter >= chapterCount) return null
    return {
      reference: formatVerseRef(book.id, displayName, parsed.chapter + 1, 1),
      initialChapterView: false,
    }
  }

  if (anchorVerse > 1) {
    return {
      reference: formatVerseRef(book.id, displayName, parsed.chapter, anchorVerse - 1),
      initialChapterView: false,
    }
  }
  if (parsed.chapter <= 1) return null
  const prevChapterVerses = book.versesPerChapter[parsed.chapter - 2]
  if (prevChapterVerses == null) return null
  return {
    reference: formatVerseRef(book.id, displayName, parsed.chapter - 1, prevChapterVerses),
    initialChapterView: false,
  }
}

export function pickerPassageHasPrevious(reference: string): boolean {
  return adjacentPickerPassage(reference, 'prev') !== null
}

export function pickerPassageHasNext(reference: string): boolean {
  return adjacentPickerPassage(reference, 'next') !== null
}
