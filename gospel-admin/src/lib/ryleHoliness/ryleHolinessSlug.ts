/** Public template slug for J.C. Ryle CCEL *Holiness* (single profile). */
export const RYLE_HOLINESS_SLUG = 'jryh'

export function ryleHolinessProfileTitle(): string {
  return 'Holiness (J.C. Ryle)'
}

export function isRyleHolinessProfileSlug(slug: string): boolean {
  return slug.trim().toLowerCase() === RYLE_HOLINESS_SLUG
}
