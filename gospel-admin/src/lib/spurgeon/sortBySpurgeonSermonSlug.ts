/**
 * Spurgeon sermon list order: **title** “Sermon N…” when present (what users read),
 * else numeric **`sg…`** slug. Tie-break on slug so order is stable.
 */

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
