/** CCEL Thomas Watson book profile slugs (single profile per work). */
export const WATSON_CONTENTMENT_SLUG = 'twcm'
export const WATSON_BEATITUDES_SLUG = 'twbt'
export const WATSON_DIVINITY_SLUG = 'twbd'
export const WATSON_CORDIAL_SLUG = 'twdc'
export const WATSON_LORDS_PRAYER_SLUG = 'twlp'
export const WATSON_COMMANDMENTS_SLUG = 'twtc'

export const WATSON_BOOK_SLUGS = [
  WATSON_CONTENTMENT_SLUG,
  WATSON_BEATITUDES_SLUG,
  WATSON_DIVINITY_SLUG,
  WATSON_CORDIAL_SLUG,
  WATSON_LORDS_PRAYER_SLUG,
  WATSON_COMMANDMENTS_SLUG,
] as const

export type WatsonBookSlug = (typeof WATSON_BOOK_SLUGS)[number]

const SLUG_SET = new Set<string>(WATSON_BOOK_SLUGS)

export function isWatsonBookProfileSlug(slug: string): boolean {
  return SLUG_SET.has(slug.trim().toLowerCase())
}

export function watsonContentmentProfileTitle(): string {
  return 'The Art of Divine Contentment (Thomas Watson)'
}

export function watsonBeatitudesProfileTitle(): string {
  return 'The Beatitudes (Thomas Watson)'
}

export function watsonDivinityProfileTitle(): string {
  return 'A Body of Divinity (Thomas Watson)'
}

export function watsonCordialProfileTitle(): string {
  return 'All Things for Good (Thomas Watson)'
}

export function watsonLordsPrayerProfileTitle(): string {
  return "The Lord's Prayer (Thomas Watson)"
}

export function watsonCommandmentsProfileTitle(): string {
  return 'The Ten Commandments (Thomas Watson)'
}
