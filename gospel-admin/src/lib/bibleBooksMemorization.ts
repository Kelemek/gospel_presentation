import { BIBLE_BOOKS_PUBLIC } from '@/lib/bibleCanonPublic'
import type { BibleBookPublic } from '@/lib/bible-structure-types'
import type { MemorizedVerse } from '@/lib/verseMemorizationStorage'

export type BibleBooksMemorizationScope = 'all' | 'ot' | 'nt'

export function isBibleBooksMemorizationItem(
  verse: MemorizedVerse
): verse is MemorizedVerse & { kind: 'bibleBooks'; bibleBooksScope: BibleBooksMemorizationScope } {
  return verse.kind === 'bibleBooks' && verse.bibleBooksScope != null
}

export function booksForScope(scope: BibleBooksMemorizationScope): BibleBookPublic[] {
  if (scope === 'all') return BIBLE_BOOKS_PUBLIC
  return BIBLE_BOOKS_PUBLIC.filter((b) => b.testament === scope)
}

export function bibleBooksPlainText(scope: BibleBooksMemorizationScope): string {
  return booksForScope(scope)
    .map((b) => b.name)
    .join(' ')
}

export function bibleBooksReferenceLabel(scope: BibleBooksMemorizationScope): string {
  if (scope === 'ot') return 'Bible Books (OT)'
  if (scope === 'nt') return 'Bible Books (NT)'
  return 'Bible Books'
}

export function bibleBooksCountLabel(scope: BibleBooksMemorizationScope): string {
  const count = booksForScope(scope).length
  return `${count} book${count === 1 ? '' : 's'}`
}

/** Testament tabs to show in the book-list UI for a given scope. */
export function bibleBooksTestamentsForScope(
  scope: BibleBooksMemorizationScope
): Array<'ot' | 'nt'> {
  if (scope === 'ot') return ['ot']
  if (scope === 'nt') return ['nt']
  return ['ot', 'nt']
}
