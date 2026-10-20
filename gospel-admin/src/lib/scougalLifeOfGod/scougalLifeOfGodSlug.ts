/** Public template slug for Henry Scougal CCEL *The Life of God in the Soul of Man* (single profile). */
export const SCOUGAL_LIFE_OF_GOD_SLUG = 'hslg'

export function scougalLifeOfGodProfileTitle(): string {
  return 'The Life of God in the Soul of Man (Henry Scougal)'
}

export function isScougalLifeOfGodProfileSlug(slug: string): boolean {
  return slug.trim().toLowerCase() === SCOUGAL_LIFE_OF_GOD_SLUG
}
