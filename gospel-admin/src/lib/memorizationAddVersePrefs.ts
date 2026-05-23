import type { BibleBookPublic } from '@/lib/bible-structure-types'
import { BIBLE_BOOKS_PUBLIC } from '@/lib/bibleCanonPublic'
import { bookNameToUsfm } from '@/lib/api-bible-passage-id'
import { parseReference } from '@/lib/parse-scripture-reference'

export const MEMORIZE_ADD_TESTAMENT_KEY = 'gospel-memorization-add-testament'

export type MemorizeAddTestament = 'ot' | 'nt'

export function readMemorizeAddTestament(): MemorizeAddTestament {
  if (typeof window === 'undefined') return 'ot'
  try {
    const v = window.sessionStorage.getItem(MEMORIZE_ADD_TESTAMENT_KEY)
    if (v === 'ot' || v === 'nt') return v
  } catch {
    // private mode / disabled storage
  }
  return 'ot'
}

export function writeMemorizeAddTestament(testament: MemorizeAddTestament): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(MEMORIZE_ADD_TESTAMENT_KEY, testament)
  } catch {
    // ignore
  }
}

/** Resolve book + testament from a display reference (e.g. "1 Peter 2:13"). */
export function memorizeAddBookFromReference(reference: string): BibleBookPublic | null {
  const parsed = parseReference(reference.trim())
  if (!parsed) return null
  const usfm = bookNameToUsfm(parsed.book)
  if (!usfm) return null
  return BIBLE_BOOKS_PUBLIC.find((b) => b.id === usfm) ?? null
}
