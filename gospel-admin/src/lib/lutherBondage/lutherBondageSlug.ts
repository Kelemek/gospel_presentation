/** Public template slug for Luther CCEL *The Bondage of the Will* (single profile). */
export const LUTHER_BONDAGE_SLUG = 'ltbw'

export function lutherBondageProfileTitle(): string {
  return 'The Bondage of the Will (Martin Luther)'
}

export function isLutherBondageProfileSlug(slug: string): boolean {
  return slug.trim().toLowerCase() === LUTHER_BONDAGE_SLUG
}
