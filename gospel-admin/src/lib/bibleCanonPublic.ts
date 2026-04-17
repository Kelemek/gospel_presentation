import { BIBLE_CANON_BOOKS_STATIC } from '@/lib/bibleCanonStatic'
import type { BibleBookPublic } from '@/lib/bible-structure-types'

function buildBibleBooksPublic(): BibleBookPublic[] {
  return BIBLE_CANON_BOOKS_STATIC.map((book) => ({
    id: book.id,
    name: book.name,
    nameLong: book.nameLong,
    testament: book.testament,
    chapters: book.versesPerChapter.map((verseCount, i) => ({
      id: `${book.id}-${i + 1}`,
      number: String(i + 1),
      verseCount,
    })),
  }))
}

/** Protestant canon for UI pickers (Add verse, etc.); derived from `bibleCanonStatic.ts`. */
export const BIBLE_BOOKS_PUBLIC: BibleBookPublic[] = buildBibleBooksPublic()
