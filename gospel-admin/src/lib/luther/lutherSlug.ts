/** Public template slug for Luther's CCEL Commentary on Galatians (single profile). */
export const LUTHER_GALATIANS_SLUG = 'lgal'

/** Legacy/experimental slugs — hide from admin pickers; use {@link LUTHER_GALATIANS_SLUG} only. */
export const DEPRECATED_LUTHER_GALATIANS_SLUGS = new Set(['luthergal'])

export function lutherGalatiansProfileTitle(): string {
  return 'Commentary on Galatians (Martin Luther)'
}

export function isLutherGalatiansProfileSlug(slug: string): boolean {
  return slug.trim().toLowerCase() === LUTHER_GALATIANS_SLUG
}

export function isDeprecatedLutherGalatiansSlug(slug: string): boolean {
  return DEPRECATED_LUTHER_GALATIANS_SLUGS.has(slug.trim().toLowerCase())
}
