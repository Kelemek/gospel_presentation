/** All translation codes the app recognizes (DB, ESV API, API.Bible). */
export const BIBLE_TRANSLATION_CODES = [
  'esv',
  'kjv',
  'nasb',
  'lsb',
  'niv',
  'nlt',
  'csb',
] as const

export type BibleTranslation = (typeof BIBLE_TRANSLATION_CODES)[number]

/** Translations fetched from API.Bible (server cache + verse limit, like ESV). */
export const API_BIBLE_TRANSLATION_CODES = ['niv', 'nlt', 'csb'] as const

export type ApiBibleTranslation = (typeof API_BIBLE_TRANSLATION_CODES)[number]

/** ESV + API.Bible rows in `scripture_cache` (500-verse LRU cap each). */
export const REMOTE_SCRIPTURE_CACHE_CODES = ['esv', ...API_BIBLE_TRANSLATION_CODES] as const

export type RemoteScriptureCacheCode = (typeof REMOTE_SCRIPTURE_CACHE_CODES)[number]

export function isBibleTranslation(s: string | null | undefined): s is BibleTranslation {
  return !!s && (BIBLE_TRANSLATION_CODES as readonly string[]).includes(s)
}

export function isApiBibleTranslation(s: string): s is ApiBibleTranslation {
  return (API_BIBLE_TRANSLATION_CODES as readonly string[]).includes(s)
}
