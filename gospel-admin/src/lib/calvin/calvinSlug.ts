import { bookNameToUsfm } from '@/lib/api-bible-passage-id'
import { GOSPEL_BIBLE_BOOK_NAMES } from '@/lib/gospelBibleBookNames'
import { canonOrderIndexForUsfm, normalizeCalvinBookUsfm } from '@/lib/calvin/calvinUsfmNormalize'

const CALVIN_SLUG_RE = /^cv([A-Z0-9]+)$/i

/** Default label for the Resources menu row that opens {@link CalvinCommentariesModal}. */
export const CALVIN_LIBRARY_DEFAULT_TITLE = "Calvin's Commentaries"

/** True when `slug` is a Calvin commentary book profile (`cv` + USFM book code). */
export function isCalvinCommentaryProfileSlug(slug: string): boolean {
  return CALVIN_SLUG_RE.test(slug.trim())
}

export function calvinUsfmFromSlug(slug: string): string | null {
  const m = CALVIN_SLUG_RE.exec(slug.trim())
  if (!m) return null
  return normalizeCalvinBookUsfm(m[1]) ?? m[1].toUpperCase()
}

export function calvinSlugForUsfm(usfm: string): string {
  const canonical = normalizeCalvinBookUsfm(usfm) ?? usfm.trim().toUpperCase()
  return `cv${canonical.toLowerCase()}`
}

function displayBookNameForUsfm(usfm: string): string {
  const canonical = normalizeCalvinBookUsfm(usfm) ?? usfm
  for (const name of GOSPEL_BIBLE_BOOK_NAMES) {
    if (bookNameToUsfm(name) === canonical) return name
  }
  return canonical
}

/** Profile title for a canonical book, e.g. "Calvin on Genesis". */
export function calvinProfileTitleForUsfm(usfm: string): string {
  return `Calvin on ${displayBookNameForUsfm(usfm)}`
}

/** Sort Calvin book profiles in Protestant canon order (Genesis → Revelation). */
export function sortCalvinBooksByCanonOrder<T extends { slug: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const ua = calvinUsfmFromSlug(a.slug) ?? ''
    const ub = calvinUsfmFromSlug(b.slug) ?? ''
    const oa = canonOrderIndexForUsfm(ua)
    const ob = canonOrderIndexForUsfm(ub)
    if (oa !== ob) return oa - ob
    return a.slug.localeCompare(b.slug)
  })
}

/** @deprecated Use {@link sortCalvinBooksByCanonOrder} for library lists. */
export function sortCalvinBooksByTitleAZ<T extends { slug: string; title: string }>(rows: T[]): T[] {
  return sortCalvinBooksByCanonOrder(rows)
}
