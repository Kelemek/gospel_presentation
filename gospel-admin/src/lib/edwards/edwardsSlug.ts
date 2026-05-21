/** Public template slug prefix for CCEL Jonathan Edwards Select Sermons (`je01` …). */
export const EDWARDS_SERMON_SLUG_PREFIX = 'je'

export function slugForEdwardsSermonNumber(n: number): string {
  if (!Number.isFinite(n) || n < 1) {
    throw new Error(`Invalid Edwards sermon number: ${n}`)
  }
  return `${EDWARDS_SERMON_SLUG_PREFIX}${String(n).padStart(2, '0')}`
}

/** True when `slug` is a CCEL Edwards sermon profile (`je` + digits). */
export function isEdwardsSermonProfileSlug(slug: string): boolean {
  return /^je\d+$/i.test(slug.trim())
}

export function edwardsSermonNumberFromSlug(slug: string): number {
  const m = /^je(\d+)$/i.exec(slug.trim())
  if (!m) return Number.MAX_SAFE_INTEGER
  const n = parseInt(m[1], 10)
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER
}

/** Display title for modal lists (plain title; no catalog prefix to strip). */
export function edwardsSermonTitleForModalDisplay(title: string): string {
  return title.trim() || 'Untitled'
}

export function sortEdwardsSermonsByDisplayTitleAZ(
  rows: { slug: string; title: string }[]
): { slug: string; title: string }[] {
  return [...rows].sort((a, b) => {
    const ta = edwardsSermonTitleForModalDisplay(a.title || a.slug)
    const tb = edwardsSermonTitleForModalDisplay(b.title || b.slug)
    const cmp = ta.localeCompare(tb, undefined, { sensitivity: 'base' })
    if (cmp !== 0) return cmp
    return edwardsSermonNumberFromSlug(a.slug) - edwardsSermonNumberFromSlug(b.slug)
  })
}
