/** Public template slug for CCEL *The Pilgrim's Progress* (single profile). */
export const PILGRIM_PROGRESS_SLUG = 'ppgr'

export function pilgrimProgressProfileTitle(): string {
  return "The Pilgrim's Progress (John Bunyan)"
}

export function isPilgrimProgressProfileSlug(slug: string): boolean {
  return slug.trim().toLowerCase() === PILGRIM_PROGRESS_SLUG
}
