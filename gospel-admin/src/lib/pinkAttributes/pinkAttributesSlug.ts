/** Public template slug for A.W. Pink *The Attributes of God* (Chapel Library edition). */
export const PINK_ATTRIBUTES_SLUG = 'pkag'

export function pinkAttributesProfileTitle(): string {
  return 'The Attributes of God (A.W. Pink)'
}

export function isPinkAttributesProfileSlug(slug: string): boolean {
  return slug.trim().toLowerCase() === PINK_ATTRIBUTES_SLUG
}
