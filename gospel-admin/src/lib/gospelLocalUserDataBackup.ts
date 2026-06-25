import { Capacitor } from '@capacitor/core'
import { PROFILE_BOOKMARKS_STORAGE_KEY } from '@/lib/profileBookmarksStorage'
import { PROFILE_HIGHLIGHTS_STORAGE_KEY } from '@/lib/profileHighlightsStorage'
import { VERSE_PIN_STORAGE_KEY_PREFIX, LEGACY_SCRIPTURE_PROGRESS_KEY_PREFIX } from '@/lib/versePinStorageConstants'
import { MEMORIZE_LISTEN_SPEED_STORAGE_KEY } from '@/lib/memorizeListenSpeedStorage'
import { PROFILE_READ_ALONG_UNDERLINE_STYLE_STORAGE_KEY } from '@/lib/profileReadAlongUnderlineStyleStorage'
import { PRESENTATION_FIRST_VISIT_WELCOME_KEY } from '@/lib/presentationWelcomeStorage'
import { PRESENTATION_READ_COMPLETE_STORAGE_KEY } from '@/lib/presentationReadCompleteStorage'
import { PROFILE_LAST_OPEN_RESOURCE_STORAGE_KEY } from '@/lib/profileLastOpenResourceStorage'
import {
  getGospelClientStorageMemoryEntries,
  gospelStorageGet,
  gospelStorageSet,
  hydrateGospelClientStorage,
} from '@/lib/gospelClientStorage'
import { idbListKeys } from '@/lib/gospelClientKvStore'
import {
  GOSPEL_ANSWERS_KEY_PREFIX,
  isProfileOfflineCacheKey,
  isProfileReadAlongPersistenceKey,
  shouldUseIndexedDb,
  VERSE_MEMORIZATION_STORAGE_KEY,
} from '@/lib/gospelClientStoragePolicy'
import {
  CAPACITOR_DEPLOY_ACK_VERSION_KEY,
  CAPACITOR_DEPLOY_CHANGELOG_SEEN_COUNT_KEY,
} from '@/lib/capacitorAppDeployVersion'
import { DAILY_VERSE_CHALLENGE_STORAGE_KEY } from '@/lib/dailyVerseChallenge'
import { MCHEYNE_START_DATE_KEY_PREFIX } from '@/lib/mcheyne/mcheyneStartDateStorage'
import { SCRIPTURE_SHOW_VERSE_NUMBERS_STORAGE_KEY } from '@/lib/scriptureVerseNumbersPreference'
import { GOSPEL_SYNC_KEY_PREFIX } from '@/lib/gospelDeviceSync/constants'

export { GOSPEL_ANSWERS_KEY_PREFIX }

export const GOSPEL_LOCAL_USER_DATA_KIND = 'gospel-local-user-data' as const
export const GOSPEL_LOCAL_USER_DATA_SCHEMA_VERSION = 1 as const

const TRANSLATION_STORAGE_KEY = 'gospel-preferred-translation'
const THEME_STORAGE_KEY = 'gospel-profile-theme'
const TEXT_SIZE_STORAGE_KEY = 'gospel-profile-text-size'

/** Keys we always consider for export when present (exact match). */
export const GOSPEL_LOCAL_USER_DATA_FIXED_KEYS = [
  PROFILE_BOOKMARKS_STORAGE_KEY,
  PROFILE_HIGHLIGHTS_STORAGE_KEY,
  VERSE_MEMORIZATION_STORAGE_KEY,
  TRANSLATION_STORAGE_KEY,
  THEME_STORAGE_KEY,
  TEXT_SIZE_STORAGE_KEY,
  MEMORIZE_LISTEN_SPEED_STORAGE_KEY,
  PROFILE_READ_ALONG_UNDERLINE_STYLE_STORAGE_KEY,
  PRESENTATION_FIRST_VISIT_WELCOME_KEY,
  PRESENTATION_READ_COMPLETE_STORAGE_KEY,
  PROFILE_LAST_OPEN_RESOURCE_STORAGE_KEY,
  SCRIPTURE_SHOW_VERSE_NUMBERS_STORAGE_KEY,
  DAILY_VERSE_CHALLENGE_STORAGE_KEY,
  CAPACITOR_DEPLOY_CHANGELOG_SEEN_COUNT_KEY,
  CAPACITOR_DEPLOY_ACK_VERSION_KEY,
] as const

const KEY_PREFIXES = [
  VERSE_PIN_STORAGE_KEY_PREFIX,
  LEGACY_SCRIPTURE_PROGRESS_KEY_PREFIX,
  GOSPEL_ANSWERS_KEY_PREFIX,
  MCHEYNE_START_DATE_KEY_PREFIX,
] as const

/** Never export or import these exact keys. */
const BLOCKED_EXACT_KEYS = new Set<string>(['gospel-admin-auth', 'gospel-view-preference'])

export interface GospelLocalUserDataPayload {
  kind: typeof GOSPEL_LOCAL_USER_DATA_KIND
  schemaVersion: typeof GOSPEL_LOCAL_USER_DATA_SCHEMA_VERSION
  exportedAt: string
  origin: string
  localStorage: Record<string, string>
}

/** Offline profile HTML blobs stay out of backup; user-owned `gospel-profile-*` keys are allowlisted or matched above. */
export function isProfileReadingResumePersistenceKey(key: string): boolean {
  return key.startsWith('gospel-profile-reading-resume:')
}

export function isGospelLocalUserDataImportKey(key: string): boolean {
  if (BLOCKED_EXACT_KEYS.has(key)) return false
  if (key.startsWith(GOSPEL_SYNC_KEY_PREFIX)) return false
  if (isProfileReadAlongPersistenceKey(key)) return true
  if (isProfileReadingResumePersistenceKey(key)) return true
  if (isProfileOfflineCacheKey(key)) return false
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

  for (const [key, value] of getGospelClientStorageMemoryEntries()) {
    if (!isGospelLocalUserDataImportKey(key)) continue
    if (value !== '') out[key] = value
  }

  return out
}

async function mergeExportableKey(
  localStorageMap: Record<string, string>,
  key: string
): Promise<void> {
  if (!isGospelLocalUserDataImportKey(key)) return
  const v = await gospelStorageGet(key)
  if (v != null && v !== '') {
    localStorageMap[key] = v
  }
}

export async function buildGospelLocalUserDataPayload(storage: Storage): Promise<GospelLocalUserDataPayload> {
  await hydrateGospelClientStorage()
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const localStorageMap: Record<string, string> = collectGospelLocalUserDataForExport(storage)

  for (const key of GOSPEL_LOCAL_USER_DATA_FIXED_KEYS) {
    await mergeExportableKey(localStorageMap, key)
  }

  for (const key of readAllLocalStorageKeys(storage)) {
    await mergeExportableKey(localStorageMap, key)
  }

  // Keys migrated to IndexedDB are removed from localStorage; enumerate IDB so
  // per-profile pins, answers, read-along, etc. are not omitted from backup.
  try {
    const idbKeys = await idbListKeys()
    for (const key of idbKeys) {
      await mergeExportableKey(localStorageMap, key)
    }
  } catch {
    /* IDB unavailable — rely on localStorage + in-memory cache */
  }

  return {
    kind: GOSPEL_LOCAL_USER_DATA_KIND,
    schemaVersion: GOSPEL_LOCAL_USER_DATA_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    origin,
    localStorage: localStorageMap,
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

export async function applyGospelLocalUserDataImport(
  payload: GospelLocalUserDataPayload,
  storage: Storage
): Promise<void> {
  await hydrateGospelClientStorage()
  const writesThroughClientStorage =
    typeof window !== 'undefined' && storage === window.localStorage
  for (const [key, value] of Object.entries(payload.localStorage)) {
    if (!isGospelLocalUserDataImportKey(key)) continue
    const saved = await gospelStorageSet(key, value)
    if (!writesThroughClientStorage && !shouldUseIndexedDb(key)) {
      try {
        storage.setItem(key, value)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        throw new Error(`Could not save restored data (${msg}). Your device storage may be full.`)
      }
      continue
    }
    if (!saved) {
      try {
        storage.setItem(key, value)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        throw new Error(`Could not save restored data (${msg}). Your device storage may be full.`)
      }
    }
  }
  // Runtime import avoids gospelClientStorage ↔ verseMemorizationStorage init cycle (device sync).
  const { emitMemorizationChanged } = await import('@/lib/verseMemorizationStorage')
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
 * Backup download filename. On **native Android** the extension is **`.txt`** so the system share intent
 * uses **`text/plain`** and more targets (including **Files**) tend to appear; file contents are still JSON.
 */
export function gospelLocalBackupFilename(
  dateCompact: string,
  platform: string,
  isNativePlatform: boolean
): string {
  if (isNativePlatform && platform === 'android') {
    return `gospel-local-backup-${dateCompact}.txt`
  }
  return `gospel-local-backup-${dateCompact}.json`
}

/**
 * Saves backup JSON.
 * - **Capacitor Android:** writes JSON to app cache via `@capacitor/filesystem`, then `@capacitor/share`
 *   (native share sheet). Plugins are **only imported on Android** so an older iOS build never loads them.
 * - **Capacitor iOS:** unchanged — Web Share API with `{ files: [file] }` only, then anchor fallback.
 * - **Web:** `<a download>` with immediate blob URL revoke.
 */
export async function downloadGospelLocalUserDataBackup(payload: GospelLocalUserDataPayload): Promise<void> {
  if (typeof window === 'undefined') return
  const date = payload.exportedAt.slice(0, 10).replace(/-/g, '')
  const isNative = Capacitor.isNativePlatform()
  const filename = gospelLocalBackupFilename(date, Capacitor.getPlatform(), isNative)
  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const isAndroidNative = isNative && Capacitor.getPlatform() === 'android'
  const isIosNative = isNative && Capacitor.getPlatform() === 'ios'

  if (isAndroidNative) {
    try {
      const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
      const { Share } = await import('@capacitor/share')
      const cachePath = `gospel-local-backups/${filename}`
      await Filesystem.writeFile({
        path: cachePath,
        data: json,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
        recursive: true,
      })
      const { uri } = await Filesystem.getUri({
        path: cachePath,
        directory: Directory.Cache,
      })
      await Share.share({
        title: filename,
        dialogTitle: 'Save gospel backup',
        files: [uri],
      })
      return
    } catch {
      triggerAnchorDownload(blob, filename, NATIVE_ANCHOR_REVOKE_DELAY_MS)
      return
    }
  }

  if (isIosNative && typeof navigator.share === 'function') {
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

  triggerAnchorDownload(blob, filename, isNative ? NATIVE_ANCHOR_REVOKE_DELAY_MS : 0)
}
