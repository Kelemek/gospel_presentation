/** Public template slug for Spurgeon CCEL *All of Grace* (single profile). */
export const ALL_OF_GRACE_SLUG = 'aogr'

export function allOfGraceProfileTitle(): string {
  return 'All of Grace (Charles H. Spurgeon)'
}

export function isAllOfGraceProfileSlug(slug: string): boolean {
  return slug.trim().toLowerCase() === ALL_OF_GRACE_SLUG
}
