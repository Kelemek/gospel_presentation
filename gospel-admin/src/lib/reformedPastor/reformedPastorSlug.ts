/** Public template slug for Richard Baxter CCEL *The Reformed Pastor* (single profile). */
export const REFORMED_PASTOR_SLUG = 'bxrp'

export function reformedPastorProfileTitle(): string {
  return 'The Reformed Pastor (Richard Baxter)'
}

export function isReformedPastorProfileSlug(slug: string): boolean {
  return slug.trim().toLowerCase() === REFORMED_PASTOR_SLUG
}
