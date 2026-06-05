/** Freedom of the Will (CCEL `edwards/will.xml`). */
export const EDWARDS_FREEDOM_OF_WILL_SLUG = 'jefow'

/** Religious Affections (CCEL `edwards/affections.xml`). */
export const EDWARDS_RELIGIOUS_AFFECTIONS_SLUG = 'jerea'

/** Treatise on Grace (CCEL `edwards/treatiseongrace.xml`). */
export const EDWARDS_TREATISE_ON_GRACE_SLUG = 'jetog'

const EDWARDS_BOOK_SLUGS = new Set([
  EDWARDS_FREEDOM_OF_WILL_SLUG,
  EDWARDS_RELIGIOUS_AFFECTIONS_SLUG,
  EDWARDS_TREATISE_ON_GRACE_SLUG,
])

export function edwardsFreedomOfWillProfileTitle(): string {
  return 'Freedom of the Will (Jonathan Edwards)'
}

export function edwardsReligiousAffectionsProfileTitle(): string {
  return 'Religious Affections (Jonathan Edwards)'
}

export function edwardsTreatiseOnGraceProfileTitle(): string {
  return 'Treatise on Grace (Jonathan Edwards)'
}

export function isEdwardsFreedomOfWillProfileSlug(slug: string): boolean {
  return slug.trim().toLowerCase() === EDWARDS_FREEDOM_OF_WILL_SLUG
}

export function isEdwardsReligiousAffectionsProfileSlug(slug: string): boolean {
  return slug.trim().toLowerCase() === EDWARDS_RELIGIOUS_AFFECTIONS_SLUG
}

export function isEdwardsTreatiseOnGraceProfileSlug(slug: string): boolean {
  return slug.trim().toLowerCase() === EDWARDS_TREATISE_ON_GRACE_SLUG
}

/** CCEL Edwards treatise profiles (not `je01`–`je19` sermons). */
export function isEdwardsBookProfileSlug(slug: string): boolean {
  return EDWARDS_BOOK_SLUGS.has(slug.trim().toLowerCase())
}
