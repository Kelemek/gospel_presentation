/** Public template slug for Robert Murray M'Cheyne one-year reading plan. */
export const MCHEYNE_SLUG = 'mchy'

export function mcheyneProfileTitle(): string {
  return "M'Cheyne Bible Reading Plan"
}

export function isMcheyneProfileSlug(slug: string): boolean {
  return slug.trim().toLowerCase() === MCHEYNE_SLUG
}
