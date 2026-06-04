/** Public template slug for Louis Berkhof CCEL *Systematic Theology* (single profile, six parts). */
export const BERKHOF_ST_SLUG = 'lbst'

export function berkhofProfileTitle(): string {
  return 'Systematic Theology (Louis Berkhof)'
}

export function isBerkhofSystematicTheologyProfileSlug(slug: string): boolean {
  return slug.trim().toLowerCase() === BERKHOF_ST_SLUG
}
