/** Public template slugs for Charles Hodge CCEL *Systematic Theology* (one profile per volume). */
export const HODGE_ST_VOLUME_1_SLUG = 'chst1'
export const HODGE_ST_VOLUME_2_SLUG = 'chst2'
export const HODGE_ST_VOLUME_3_SLUG = 'chst3'

export const HODGE_ST_VOLUME_SLUGS = [
  HODGE_ST_VOLUME_1_SLUG,
  HODGE_ST_VOLUME_2_SLUG,
  HODGE_ST_VOLUME_3_SLUG,
] as const

export type HodgeVolumeSlug = (typeof HODGE_ST_VOLUME_SLUGS)[number]

export type HodgeVolumeId = 1 | 2 | 3

export function hodgeVolumeSlug(volume: HodgeVolumeId): HodgeVolumeSlug {
  if (volume === 1) return HODGE_ST_VOLUME_1_SLUG
  if (volume === 2) return HODGE_ST_VOLUME_2_SLUG
  return HODGE_ST_VOLUME_3_SLUG
}

export function hodgeVolumeProfileTitle(volume: HodgeVolumeId): string {
  const ordinals = ['I', 'II', 'III'] as const
  return `Systematic Theology Vol. ${ordinals[volume - 1]} (Charles Hodge)`
}

export function isHodgeVolumeProfileSlug(slug: string): boolean {
  const s = slug.trim().toLowerCase()
  return HODGE_ST_VOLUME_SLUGS.some((v) => v === s)
}

export function hodgeVolumeFromSlug(slug: string): HodgeVolumeId | null {
  const s = slug.trim().toLowerCase()
  if (s === HODGE_ST_VOLUME_1_SLUG) return 1
  if (s === HODGE_ST_VOLUME_2_SLUG) return 2
  if (s === HODGE_ST_VOLUME_3_SLUG) return 3
  return null
}
