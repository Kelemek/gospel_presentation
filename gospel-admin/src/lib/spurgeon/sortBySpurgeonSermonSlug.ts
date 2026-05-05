/**
 * Spurgeon helpers: strip **`Sermon N.`** for display; **A–Z** list sort via {@link sortSpurgeonSermonsByDisplayTitleAZ}.
 *
 * Catalog-based ordering (`spurgeonSermonListSortKey`, `sortBySpurgeonSermonSlug`) remains for any code that still needs sermon-number order.
 */

/**
 * CCEL / DB titles sometimes store HTML entities (`&quot;`, `&amp;`, numeric refs). Decode for plain-text UI.
 * Iterates so double-encoded values (e.g. `&amp;quot;`) collapse safely.
 */
function decodeSpurgeonTitleHtmlEntities(title: string): string {
  let s = title
  let prev = ''
  while (s !== prev) {
    prev = s
    s = s
      .replace(/&quot;/g, "'")
      .replace(/&#34;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
      .replace(/&#x([0-9a-fA-F]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/&amp;/g, '&')
  }
  return s
}

/** Catalog index from slug `sg00001` → 1. */
export function spurgeonCatalogNumberFromSlug(slug: string): number {
  const s = slug.trim().toLowerCase()
  const m = /^sg(\d+)$/.exec(s)
  if (!m) return Number.MAX_SAFE_INTEGER
  const n = parseInt(m[1], 10)
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER
}

/**
 * Leading “Sermon &lt;num&gt;” from display titles (e.g. `Sermon 297-8.` → 297).
 * Returns null if the pattern does not match.
 */
export function spurgeonCatalogNumberFromTitle(title: string): number | null {
  const t = title.trim()
  const m = /^sermon\s+(\d+)/i.exec(t)
  if (!m) return null
  const n = parseInt(m[1], 10)
  return Number.isFinite(n) ? n : null
}

/**
 * Strip leading `Sermon N.` / `Sermon N-M.` catalog prefix for UI (CCEL catalog has gaps; slug still identifies the sermon).
 */
export function spurgeonSermonTitleForModalDisplay(title: string): string {
  const t = title.trim()
  const stripped = t.replace(/^sermon\s+\d+(?:-\d+)?\.\s*/i, '').trim()
  const base = stripped.length > 0 ? stripped : t
  return decodeSpurgeonTitleHtmlEntities(base)
}

/** Lowercased label for A–Z ordering: stripped catalog prefix, else slug when title empty. */
export function spurgeonSermonDisplaySortKey(row: { slug: string; title?: string }): string {
  const raw = (row.title ?? '').trim()
  const label = raw.length > 0 ? spurgeonSermonTitleForModalDisplay(raw) : row.slug.trim()
  return label.toLowerCase()
}

/** Public sermon lists: alphabetical by visible title (after stripping `Sermon N.`), tie-break `slug`. */
export function sortSpurgeonSermonsByDisplayTitleAZ<T extends { slug: string; title?: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const ka = spurgeonSermonDisplaySortKey(a)
    const kb = spurgeonSermonDisplaySortKey(b)
    const c = ka.localeCompare(kb, 'en', { sensitivity: 'base' })
    if (c !== 0) return c
    return a.slug.localeCompare(b.slug)
  })
}

export function spurgeonSermonListSortKey(row: { slug: string; title?: string }): number {
  if (row.title) {
    const fromTitle = spurgeonCatalogNumberFromTitle(row.title)
    if (fromTitle !== null) return fromTitle
  }
  return spurgeonCatalogNumberFromSlug(row.slug)
}

export function compareSpurgeonSermonSlugs(aSlug: string, bSlug: string): number {
  return spurgeonCatalogNumberFromSlug(aSlug) - spurgeonCatalogNumberFromSlug(bSlug)
}

export function compareSpurgeonSermonRows(
  a: { slug: string; title?: string },
  b: { slug: string; title?: string }
): number {
  const ka = spurgeonSermonListSortKey(a)
  const kb = spurgeonSermonListSortKey(b)
  if (ka !== kb) return ka - kb
  return compareSpurgeonSermonSlugs(a.slug, b.slug)
}

/** Sort public sermon rows for library / scripture hit lists. */
export function sortBySpurgeonSermonSlug<T extends { slug: string; title?: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => compareSpurgeonSermonRows(a, b))
}
