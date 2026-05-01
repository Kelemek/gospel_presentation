import { Capacitor } from '@capacitor/core'
import { PROFILE_BOOKMARKS_STORAGE_KEY } from '@/lib/profileBookmarksStorage'
import { VERSE_MEMORIZATION_STORAGE_KEY, emitMemorizationChanged } from '@/lib/verseMemorizationStorage'
import { VERSE_PIN_STORAGE_KEY_PREFIX, LEGACY_SCRIPTURE_PROGRESS_KEY_PREFIX } from '@/lib/versePinStorage'
import { MEMORIZE_LISTEN_SPEED_STORAGE_KEY } from '@/lib/memorizeListenSpeedStorage'
import { PRESENTATION_FIRST_VISIT_WELCOME_KEY } from '@/lib/presentationWelcomeStorage'

/** Keep in sync with `ANSWERS_STORAGE_KEY_PREFIX` in `GospelSection.tsx`. */
export const GOSPEL_ANSWERS_KEY_PREFIX = 'gospel-answers-'

export const GOSPEL_LOCAL_USER_DATA_KIND = 'gospel-local-user-data' as const
export const GOSPEL_LOCAL_USER_DATA_SCHEMA_VERSION = 1 as const

const TRANSLATION_STORAGE_KEY = 'gospel-preferred-translation'
const THEME_STORAGE_KEY = 'gospel-profile-theme'
const TEXT_SIZE_STORAGE_KEY = 'gospel-profile-text-size'

/** Keys we always consider for export when present (exact match). */
export const GOSPEL_LOCAL_USER_DATA_FIXED_KEYS = [
  PROFILE_BOOKMARKS_STORAGE_KEY,
  VERSE_MEMORIZATION_STORAGE_KEY,
  TRANSLATION_STORAGE_KEY,
  THEME_STORAGE_KEY,
  TEXT_SIZE_STORAGE_KEY,
  MEMORIZE_LISTEN_SPEED_STORAGE_KEY,
  PRESENTATION_FIRST_VISIT_WELCOME_KEY,
] as const

const KEY_PREFIXES = [
  VERSE_PIN_STORAGE_KEY_PREFIX,
  LEGACY_SCRIPTURE_PROGRESS_KEY_PREFIX,
  GOSPEL_ANSWERS_KEY_PREFIX,
] as const

/** Never export or import these exact keys. */
const BLOCKED_EXACT_KEYS = new Set<string>(['gospel-admin-auth', 'gospel-view-preference'])

const ALLOWED_GOSPEL_PROFILE_SUFFIXES = new Set([
  'bookmarks',
  'theme',
  'text-size',
])

export interface GospelLocalUserDataPayload {
  kind: typeof GOSPEL_LOCAL_USER_DATA_KIND
  schemaVersion: typeof GOSPEL_LOCAL_USER_DATA_SCHEMA_VERSION
  exportedAt: string
  origin: string
  localStorage: Record<string, string>
}

function isProfileCacheKey(key: string): boolean {
  if (!key.startsWith('gospel-profile-')) return false
  const rest = key.slice('gospel-profile-'.length)
  return !ALLOWED_GOSPEL_PROFILE_SUFFIXES.has(rest)
}

export function isGospelLocalUserDataImportKey(key: string): boolean {
  if (BLOCKED_EXACT_KEYS.has(key)) return false
  if (isProfileCacheKey(key)) return false
  if ((GOSPEL_LOCAL_USER_DATA_FIXED_KEYS as readonly string[]).includes(key)) return true
  return KEY_PREFIXES.some((p) => key.startsWith(p))
}

function readAllLocalStorageKeys(storage: Storage): string[] {
  const keys: string[] = []
  for (let i = 0; i < storage.length; i += 1) {
    const k = storage.key(i)
    if (k) keys.push(k)
  }
  return keys
}

export function collectGospelLocalUserDataForExport(storage: Storage): Record<string, string> {
  const out: Record<string, string> = {}

  for (const key of GOSPEL_LOCAL_USER_DATA_FIXED_KEYS) {
    if (!isGospelLocalUserDataImportKey(key)) continue
    try {
      const v = storage.getItem(key)
      if (v != null && v !== '') {
        out[key] = v
      }
    } catch {
      /* ignore */
    }
  }

  for (const key of readAllLocalStorageKeys(storage)) {
    if (Object.prototype.hasOwnProperty.call(out, key)) continue
    if (!isGospelLocalUserDataImportKey(key)) continue
    try {
      const v = storage.getItem(key)
      if (v != null && v !== '') out[key] = v
    } catch {
      /* ignore */
    }
  }

  return out
}

export function buildGospelLocalUserDataPayload(storage: Storage): GospelLocalUserDataPayload {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return {
    kind: GOSPEL_LOCAL_USER_DATA_KIND,
    schemaVersion: GOSPEL_LOCAL_USER_DATA_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    origin,
    localStorage: collectGospelLocalUserDataForExport(storage),
  }
}

const ALLOWED_TOP_LEVEL = new Set(['kind', 'schemaVersion', 'exportedAt', 'origin', 'localStorage'])

export function parseGospelLocalUserDataImport(jsonText: string): GospelLocalUserDataPayload {
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText) as unknown
  } catch {
    throw new Error('This file is not valid backup data (could not read as JSON).')
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('This file is not valid backup data.')
  }
  const o = parsed as Record<string, unknown>
  for (const k of Object.keys(o)) {
    if (!ALLOWED_TOP_LEVEL.has(k)) {
      throw new Error('This file is not a Gospel backup (unexpected fields).')
    }
  }
  if (o.kind !== GOSPEL_LOCAL_USER_DATA_KIND) {
    throw new Error('This file is not a Gospel backup (wrong type).')
  }
  if (o.schemaVersion !== GOSPEL_LOCAL_USER_DATA_SCHEMA_VERSION) {
    throw new Error('This backup was made with a different app version and cannot be restored here.')
  }
  const map = o.localStorage
  if (!map || typeof map !== 'object' || Array.isArray(map)) {
    throw new Error('This file is not valid backup data (missing storage data).')
  }
  const localStorage: Record<string, string> = {}
  for (const [key, value] of Object.entries(map as Record<string, unknown>)) {
    if (typeof key !== 'string' || key.length === 0) continue
    if (typeof value !== 'string') {
      throw new Error('This file is not valid backup data (corrupt entries).')
    }
    if (!isGospelLocalUserDataImportKey(key)) {
      throw new Error('This file contains keys that cannot be restored safely.')
    }
    localStorage[key] = value
  }
  return {
    kind: GOSPEL_LOCAL_USER_DATA_KIND,
    schemaVersion: GOSPEL_LOCAL_USER_DATA_SCHEMA_VERSION,
    exportedAt: typeof o.exportedAt === 'string' ? o.exportedAt : '',
    origin: typeof o.origin === 'string' ? o.origin : '',
    localStorage,
  }
}

export function applyGospelLocalUserDataImport(payload: GospelLocalUserDataPayload, storage: Storage): void {
  for (const [key, value] of Object.entries(payload.localStorage)) {
    if (!isGospelLocalUserDataImportKey(key)) continue
    try {
      storage.setItem(key, value)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      throw new Error(`Could not save restored data (${msg}). Your browser storage may be full.`)
    }
  }
  emitMemorizationChanged()
}

/**
 * Programmatic `<a download>`. Revoking the blob URL immediately breaks downloads on some
 * Android WebViews; use a delay on native when `revokeAfterMs > 0`.
 */
function triggerAnchorDownload(blob: Blob, filename: string, revokeAfterMs = 0): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  const revoke = () => {
    URL.revokeObjectURL(url)
    a.remove()
  }
  requestAnimationFrame(() => {
    try {
      a.click()
    } finally {
      if (revokeAfterMs > 0) {
        window.setTimeout(revoke, revokeAfterMs)
      } else {
        revoke()
      }
    }
  })
}

/** Delay before revoking blob URL for native anchor fallback (Android WebView often needs this). */
const NATIVE_ANCHOR_REVOKE_DELAY_MS = 90_000

/**
 * Saves backup JSON. On Capacitor iOS we use the Web Share API with **files only** (no `text`/`title`),
 * otherwise iOS can offer two items (text + file). On Android WebView, `navigator.share` with files is
 * often missing or unreliable; we try it first, then fall back to `<a download>` with a delayed blob
 * URL revoke. No extra Capacitor plugins required.
 */
export async function downloadGospelLocalUserDataBackup(payload: GospelLocalUserDataPayload): Promise<void> {
  if (typeof window === 'undefined') return
  const date = payload.exportedAt.slice(0, 10).replace(/-/g, '')
  const filename = `gospel-local-backup-${date}.json`
  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const isNative = Capacitor.isNativePlatform()
  const isAndroidNative = isNative && Capacitor.getPlatform() === 'android'

  if (isNative && typeof navigator.share === 'function' && !isAndroidNative) {
    const file = new File([blob], filename, { type: 'application/json', lastModified: Date.now() })
    try {
      await navigator.share({ files: [file] })
      return
    } catch (e) {
      const name = e instanceof DOMException ? e.name : e instanceof Error ? e.name : ''
      if (name === 'AbortError') {
        return
      }
      triggerAnchorDownload(blob, filename, NATIVE_ANCHOR_REVOKE_DELAY_MS)
      return
    }
  }

  if (isAndroidNative && typeof navigator.share === 'function') {
    const file = new File([blob], filename, { type: 'application/json', lastModified: Date.now() })
    try {
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] })
        return
      }
    } catch (e) {
      const name = e instanceof DOMException ? e.name : e instanceof Error ? e.name : ''
      if (name === 'AbortError') {
        return
      }
    }
  }

  triggerAnchorDownload(blob, filename, isNative ? NATIVE_ANCHOR_REVOKE_DELAY_MS : 0)
}
