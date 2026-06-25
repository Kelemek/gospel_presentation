/** Same key as the main app on the same browser; cookie works without JavaScript on Kindle read routes. */
export const GOSPEL_PROFILE_TEXT_SIZE_KEY = 'gospel-profile-text-size'

export const GOSPEL_PROFILE_TEXT_SIZE_COOKIE = GOSPEL_PROFILE_TEXT_SIZE_KEY

export const GOSPEL_PROFILE_TEXT_SIZE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

export type KindleReadTextSize = 'normal' | 'larger' | 'largest'

const ALL_TEXT_SIZES: KindleReadTextSize[] = ['normal', 'larger', 'largest']

export const KINDLE_READ_TEXT_SIZE_MENU_OPTIONS: ReadonlyArray<{
  value: KindleReadTextSize
  label: string
}> = [
  { value: 'normal', label: 'Normal' },
  { value: 'larger', label: 'Larger' },
  { value: 'largest', label: 'Largest' },
]

export function isKindleReadTextSize(value: string | null | undefined): value is KindleReadTextSize {
  return value !== null && value !== undefined && ALL_TEXT_SIZES.includes(value as KindleReadTextSize)
}

export function resolveKindleReadTextSize(
  candidate: string | null | undefined
): KindleReadTextSize {
  const normalized = candidate?.trim().toLowerCase()
  return isKindleReadTextSize(normalized) ? normalized : 'normal'
}

export function setKindleReadTextSizeCookie(size: KindleReadTextSize): void {
  if (typeof document === 'undefined') return
  const maxAge = GOSPEL_PROFILE_TEXT_SIZE_COOKIE_MAX_AGE_SECONDS
  document.cookie = `${GOSPEL_PROFILE_TEXT_SIZE_COOKIE}=${encodeURIComponent(size)}; path=/; max-age=${maxAge}; SameSite=Lax`
}

export function readKindleReadTextSizeFromQueryString(): KindleReadTextSize | null {
  if (typeof window === 'undefined') return null
  const value = new URLSearchParams(window.location.search).get('textSize')?.trim().toLowerCase()
  return isKindleReadTextSize(value) ? value : null
}

export function readKindleReadTextSizeFromCookie(): KindleReadTextSize | null {
  if (typeof document === 'undefined') return null
  const cookieMatch = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${GOSPEL_PROFILE_TEXT_SIZE_COOKIE}=`))
  if (!cookieMatch) return null
  const value = decodeURIComponent(
    cookieMatch.slice(GOSPEL_PROFILE_TEXT_SIZE_COOKIE.length + 1)
  )
    .trim()
    .toLowerCase()
  return isKindleReadTextSize(value) ? value : null
}

export function writeKindleReadTextSizeToLocalStorage(size: KindleReadTextSize): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(GOSPEL_PROFILE_TEXT_SIZE_KEY, size)
  } catch {
    /* private mode */
  }
}

export function readKindleReadTextSizeFromLocalStorage(): KindleReadTextSize | null {
  if (typeof window === 'undefined') return null
  try {
    const value = window.localStorage.getItem(GOSPEL_PROFILE_TEXT_SIZE_KEY)?.trim().toLowerCase()
    return isKindleReadTextSize(value) ? value : null
  } catch {
    return null
  }
}

export function applyKindleReadTextSizeClass(size: KindleReadTextSize): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  for (const option of ALL_TEXT_SIZES) {
    root.classList.remove(`text-size-${option}`)
  }
  root.classList.add(`text-size-${size}`)
}

type WriteKindleReadTextSize = (size: KindleReadTextSize) => void

/** Persist text size among URL, cookie, localStorage, and html classes (Kindle read). */
export function syncKindleReadTextSizePreference(
  writeLocalStorage: WriteKindleReadTextSize = writeKindleReadTextSizeToLocalStorage
): void {
  if (typeof window === 'undefined') return

  const fromQuery = readKindleReadTextSizeFromQueryString()
  if (fromQuery) {
    writeLocalStorage(fromQuery)
    setKindleReadTextSizeCookie(fromQuery)
    applyKindleReadTextSizeClass(fromQuery)
    return
  }

  const fromCookie = readKindleReadTextSizeFromCookie()
  if (fromCookie) {
    writeLocalStorage(fromCookie)
    applyKindleReadTextSizeClass(fromCookie)
    return
  }

  const fromStorage = readKindleReadTextSizeFromLocalStorage()
  if (fromStorage) {
    setKindleReadTextSizeCookie(fromStorage)
    applyKindleReadTextSizeClass(fromStorage)
  }
}

/** Routes where `?textSize=` may set the Kindle read preference cookie (proxy). */
export function isKindleReadTextSizePreferenceRoute(pathname: string): boolean {
  if (pathname === '/read/scripture' || pathname.startsWith('/read/scripture/')) {
    return true
  }
  if (pathname.startsWith('/read/libraries/')) {
    return true
  }
  const match = pathname.match(/^\/([^/]+)\/read\/?$/)
  return Boolean(match && match[1] !== 'read')
}

/** Plain link for Kindle read Menu (no JavaScript required). */
export function kindleReadTextSizeSwitchUrl(
  slug: string,
  textSize: KindleReadTextSize,
  currentTranslation?: string
): string {
  const base = `/${encodeURIComponent(slug)}/read/`
  const params = new URLSearchParams()
  params.set('textSize', textSize)
  const translation = currentTranslation?.trim().toLowerCase()
  if (translation && translation !== 'esv') {
    params.set('translation', translation)
  }
  return `${base}?${params.toString()}`
}

/** Inline script: apply text size from URL, cookie, or localStorage before React (Kindle). */
export function kindleReadTextSizeStorageScriptContent(): string {
  const key = GOSPEL_PROFILE_TEXT_SIZE_KEY
  const maxAge = GOSPEL_PROFILE_TEXT_SIZE_COOKIE_MAX_AGE_SECONDS
  return `(function(){try{var k=${JSON.stringify(key)};var valid={normal:1,larger:1,largest:1};var classes=['text-size-normal','text-size-larger','text-size-largest'];function apply(v){if(!valid[v])v='normal';var r=document.documentElement;for(var i=0;i<3;i++)r.classList.remove(classes[i]);r.classList.add('text-size-'+v);}var v=null;var q=location.search.match(/[?&]textSize=([^&]+)/);if(q){v=decodeURIComponent(q[1]).trim().toLowerCase();}if(!v||!valid[v]){var p=document.cookie.split(';').map(function(s){return s.trim()}).find(function(s){return s.indexOf(k+'=')===0});if(p){v=decodeURIComponent(p.slice(k.length+1)).trim().toLowerCase();}}if(!v||!valid[v]){try{v=localStorage.getItem(k);}catch(e){}}if(!v||!valid[v])v='normal';apply(v);try{localStorage.setItem(k,v);}catch(e){}document.cookie=k+'='+encodeURIComponent(v)+'; path=/; max-age=${maxAge}; SameSite=Lax';}catch(e){}})();`
}
