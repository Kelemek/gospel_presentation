import { bookNameToUsfm } from '@/lib/api-bible-passage-id'
import { GOSPEL_BIBLE_BOOK_NAMES } from '@/lib/gospelBibleBookNames'
import { canonOrderIndexForUsfm, normalizeCalvinBookUsfm } from '@/lib/calvin/calvinUsfmNormalize'

const HENRY_SLUG_RE = /^mh([a-z0-9]+)$/i

/** Default label for the Resources menu row that opens the Matthew Henry study library. */
export const HENRY_LIBRARY_DEFAULT_TITLE = "Matthew Henry's Commentary"

/** True when `slug` is a Matthew Henry commentary book profile (`mh` + USFM book code). */
export function isHenryCommentaryProfileSlug(slug: string): boolean {
  return HENRY_SLUG_RE.test(slug.trim())
}

export function henryUsfmFromSlug(slug: string): string | null {
  const m = HENRY_SLUG_RE.exec(slug.trim())
  if (!m) return null
  return normalizeCalvinBookUsfm(m[1].toUpperCase()) ?? m[1].toUpperCase()
}

export function henrySlugForUsfm(usfm: string): string {
  const canonical = normalizeCalvinBookUsfm(usfm) ?? usfm.trim().toUpperCase()
  return `mh${canonical.toLowerCase()}`
}

function displayBookNameForUsfm(usfm: string): string {
  const canonical = normalizeCalvinBookUsfm(usfm) ?? usfm
  for (const name of GOSPEL_BIBLE_BOOK_NAMES) {
    if (bookNameToUsfm(name) === canonical) return name
  }
  return canonical
}

/** Profile title for a canonical book, e.g. "Matthew Henry on Genesis". */
export function henryProfileTitleForUsfm(usfm: string): string {
  return `Matthew Henry on ${displayBookNameForUsfm(usfm)}`
}

/** Sort Matthew Henry book profiles in Protestant canon order (Genesis → Revelation). */
export function sortHenryBooksByCanonOrder<T extends { slug: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const ua = henryUsfmFromSlug(a.slug) ?? ''
    const ub = henryUsfmFromSlug(b.slug) ?? ''
    const oa = canonOrderIndexForUsfm(ua)
    const ob = canonOrderIndexForUsfm(ub)
    if (oa !== ob) return oa - ob
    return a.slug.localeCompare(b.slug)
  })
}
