import type { BibleTranslation } from '@/lib/bible-translations'
import { isBibleTranslation } from '@/lib/bible-translations'

/** Cookie name shared with the main app on the same browser; localStorage mirror is Kindle-read best-effort only. */
export const GOSPEL_PREFERRED_TRANSLATION_KEY = 'gospel-preferred-translation'

export const GOSPEL_PREFERRED_TRANSLATION_COOKIE = GOSPEL_PREFERRED_TRANSLATION_KEY

export const GOSPEL_PREFERRED_TRANSLATION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

const COOKIE_MAX_AGE_SECONDS = GOSPEL_PREFERRED_TRANSLATION_COOKIE_MAX_AGE_SECONDS

export function shortTranslationMenuLabel(translationName: string, code: string): string {
  const trimmed = translationName.trim()
  const paren = trimmed.indexOf(' (')
  if (paren > 0) return trimmed.slice(0, paren)
  if (trimmed) return trimmed
  return code.toUpperCase()
}

export function resolveKindleReadTranslation(
  candidate: string | null | undefined,
  enabledCodes: readonly string[]
): BibleTranslation {
  const code = candidate?.trim().toLowerCase()
  if (code && isBibleTranslation(code) && enabledCodes.includes(code)) {
    return code
  }
  return 'esv'
}

export function setKindleReadTranslationCookie(code: string): void {
  if (typeof document === 'undefined') return
  const normalized = code.trim().toLowerCase()
  if (!normalized) return
  const encoded = encodeURIComponent(normalized)
  document.cookie = `${GOSPEL_PREFERRED_TRANSLATION_COOKIE}=${encoded}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`
}

export function readKindleReadTranslationFromQueryString(): string | null {
  if (typeof window === 'undefined') return null
  const value = new URLSearchParams(window.location.search).get('translation')?.trim().toLowerCase()
  return value || null
}

export function readKindleReadTranslationFromCookie(): string | null {
  if (typeof document === 'undefined') return null
  const cookieMatch = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${GOSPEL_PREFERRED_TRANSLATION_COOKIE}=`))
  if (!cookieMatch) return null
  const value = decodeURIComponent(
    cookieMatch.slice(GOSPEL_PREFERRED_TRANSLATION_COOKIE.length + 1)
  )
    .trim()
    .toLowerCase()
  return value || null
}

export function writeKindleReadTranslationToLocalStorage(code: string): void {
  if (typeof window === 'undefined') return
  const normalized = code.trim().toLowerCase()
  if (!normalized) return
  try {
    window.localStorage.setItem(GOSPEL_PREFERRED_TRANSLATION_KEY, normalized)
  } catch {
    /* private mode */
  }
}

export function readKindleReadTranslationFromLocalStorage(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const value = window.localStorage.getItem(GOSPEL_PREFERRED_TRANSLATION_KEY)?.trim().toLowerCase()
    return value || null
  } catch {
    return null
  }
}

type WriteKindleReadTranslation = (code: string) => void

/** Persist translation to localStorage (and cookie when set from storage). */
export function syncKindleReadTranslationPreference(
  writeLocalStorage: WriteKindleReadTranslation = writeKindleReadTranslationToLocalStorage
): void {
  if (typeof window === 'undefined') return

  const fromQuery = readKindleReadTranslationFromQueryString()
  if (fromQuery) {
    writeLocalStorage(fromQuery)
    setKindleReadTranslationCookie(fromQuery)
    return
  }

  const fromCookie = readKindleReadTranslationFromCookie()
  if (fromCookie) {
    writeLocalStorage(fromCookie)
    return
  }

  const fromStorage = readKindleReadTranslationFromLocalStorage()
  if (fromStorage) {
    setKindleReadTranslationCookie(fromStorage)
  }
}

export function translationDisplayName(
  options: ReadonlyArray<{ translation_code: string; translation_name: string }>,
  code: BibleTranslation
): string {
  const match = options.find((option) => option.translation_code === code)
  return match?.translation_name ?? code.toUpperCase()
}

/** Routes where `?translation=` may set the Kindle read preference cookie (proxy). */
export function isKindleReadTranslationPreferenceRoute(pathname: string): boolean {
  if (pathname === '/read/scripture' || pathname.startsWith('/read/scripture/')) {
    return true
  }
  const match = pathname.match(/^\/([^/]+)\/read\/?$/)
  return Boolean(match && match[1] !== 'read')
}

/** Plain link for Kindle read Menu (no JavaScript required). */
export function kindleReadTranslationSwitchUrl(
  slug: string,
  translation: BibleTranslation,
  currentTextSize?: string
): string {
  const base = `/${encodeURIComponent(slug)}/read/`
  const params = new URLSearchParams()
  params.set('translation', translation)
  const textSize = currentTextSize?.trim().toLowerCase()
  if (textSize && textSize !== 'normal') {
    params.set('textSize', textSize)
  }
  return `${base}?${params.toString()}`
}

/** Inline script: persist ?translation= or cookie to localStorage before React (Kindle). */
export function kindleReadTranslationStorageScriptContent(): string {
  const key = GOSPEL_PREFERRED_TRANSLATION_KEY
  return `(function(){try{var k=${JSON.stringify(key)};var q=location.search.match(/[?&]translation=([^&]+)/);if(q){var t=decodeURIComponent(q[1]).trim().toLowerCase();if(t){localStorage.setItem(k,t);return;}}var p=document.cookie.split(";").map(function(s){return s.trim()}).find(function(s){return s.indexOf(k+"=")===0});if(p){var v=decodeURIComponent(p.slice(k.length+1)).trim().toLowerCase();if(v)localStorage.setItem(k,v);}}catch(e){}})();`
}
