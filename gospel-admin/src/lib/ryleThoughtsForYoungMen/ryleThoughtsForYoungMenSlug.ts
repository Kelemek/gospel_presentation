/** Public template slug for J.C. Ryle *Thoughts for Young Men* (single profile). */
export const RYLE_THOUGHTS_FOR_YOUNG_MEN_SLUG = 'jrym'

export function ryleThoughtsForYoungMenProfileTitle(): string {
  return 'Thoughts for Young Men (J.C. Ryle)'
}

export function isRyleThoughtsForYoungMenProfileSlug(slug: string): boolean {
  return slug.trim().toLowerCase() === RYLE_THOUGHTS_FOR_YOUNG_MEN_SLUG
}
