import {
  GOSPEL_SYNC_DIRTY_KEYS_KEY,
  GOSPEL_SYNC_ENABLED_KEY,
  GOSPEL_SYNC_KEY_KEY,
  GOSPEL_SYNC_KEY_PREFIX,
  GOSPEL_SYNC_KEY_VERSIONS_KEY,
} from '@/lib/gospelDeviceSync/constants'
import { isProfileOfflineCacheKey } from '@/lib/gospelClientStoragePolicy'

const NEVER_SYNC_EXACT_KEYS = new Set(['gospel-admin-auth', 'gospel-view-preference'])

function shouldMarkSyncKeyDirty(key: string): boolean {
  if (isGospelSyncMetaKey(key)) return false
  if (NEVER_SYNC_EXACT_KEYS.has(key)) return false
  if (isProfileOfflineCacheKey(key)) return false
  return true
}

export type SyncKeyVersions = Record<string, { updatedAt: string; contentHash?: string }>

let suppressDirty = false

export function isGospelSyncMetaKey(key: string): boolean {
  return key.startsWith(GOSPEL_SYNC_KEY_PREFIX)
}

export function readDeviceSyncEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(GOSPEL_SYNC_ENABLED_KEY) === '1'
  } catch {
    return false
  }
}

export function readSyncKeyBase64(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const value = window.localStorage.getItem(GOSPEL_SYNC_KEY_KEY)
    return value && value.length > 0 ? value : null
  } catch {
    return null
  }
}

export function readSyncKeyVersions(): SyncKeyVersions {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(GOSPEL_SYNC_KEY_VERSIONS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as SyncKeyVersions
  } catch {
    return {}
  }
}

export function writeSyncKeyVersions(versions: SyncKeyVersions): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(GOSPEL_SYNC_KEY_VERSIONS_KEY, JSON.stringify(versions))
  } catch {
    /* ignore */
  }
}

function readDirtyKeys(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(GOSPEL_SYNC_DIRTY_KEYS_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((k): k is string => typeof k === 'string'))
  } catch {
    return new Set()
  }
}

function writeDirtyKeys(keys: Set<string>): void {
  if (typeof window === 'undefined') return
  try {
    if (keys.size === 0) {
      window.localStorage.removeItem(GOSPEL_SYNC_DIRTY_KEYS_KEY)
      return
    }
    window.localStorage.setItem(GOSPEL_SYNC_DIRTY_KEYS_KEY, JSON.stringify([...keys]))
  } catch {
    /* ignore */
  }
}

export function markSyncKeyDirty(key: string): boolean {
  if (suppressDirty || !readDeviceSyncEnabled()) return false
  if (!shouldMarkSyncKeyDirty(key)) return false
  const dirty = readDirtyKeys()
  dirty.add(key)
  writeDirtyKeys(dirty)
  return true
}

export function clearDirtyKeys(keys: Iterable<string>): void {
  const dirty = readDirtyKeys()
  for (const key of keys) {
    dirty.delete(key)
  }
  writeDirtyKeys(dirty)
}

export function getDirtyKeys(): string[] {
  return [...readDirtyKeys()]
}

export async function withSyncDirtySuppressed<T>(fn: () => Promise<T>): Promise<T> {
  suppressDirty = true
  try {
    return await fn()
  } finally {
    suppressDirty = false
  }
}

export function enableDeviceSyncLocal(syncKeyBase64: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(GOSPEL_SYNC_KEY_KEY, syncKeyBase64)
    window.localStorage.setItem(GOSPEL_SYNC_ENABLED_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function disableDeviceSyncLocal(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(GOSPEL_SYNC_ENABLED_KEY)
    window.localStorage.removeItem(GOSPEL_SYNC_KEY_KEY)
    window.localStorage.removeItem(GOSPEL_SYNC_KEY_VERSIONS_KEY)
    window.localStorage.removeItem(GOSPEL_SYNC_DIRTY_KEYS_KEY)
  } catch {
    /* ignore */
  }
}

export const DEVICE_SYNC_STATE_CHANGED_EVENT = 'gospel-device-sync-state-changed' as const

export function emitDeviceSyncStateChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(DEVICE_SYNC_STATE_CHANGED_EVENT))
}

export function isDeviceSyncActive(): boolean {
  return readDeviceSyncEnabled() && !!readSyncKeyBase64()
}
