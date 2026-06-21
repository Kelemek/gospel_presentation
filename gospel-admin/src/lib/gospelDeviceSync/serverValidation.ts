import {
  GOSPEL_SYNC_KEY_PREFIX,
  SYNC_MAX_KEYS_PER_GROUP,
  SYNC_MAX_VALUE_BYTES,
} from '@/lib/gospelDeviceSync/constants'
import { isGospelLocalUserDataImportKey } from '@/lib/gospelLocalUserDataBackup'

const STORAGE_ID_RE = /^[a-f0-9]{64}$/
const PAIRING_CODE_RE = /^\d{6}$/

export function isValidStorageId(value: string): boolean {
  return STORAGE_ID_RE.test(value)
}

export function isValidPairingCode(value: string): boolean {
  return PAIRING_CODE_RE.test(value)
}

/** Compare pairing expiry using epoch ms (PostgREST +00:00 vs JS toISOString Z). */
export function isPairingSessionExpired(expiresAt: string, nowMs = Date.now()): boolean {
  const expiresMs = Date.parse(expiresAt)
  if (Number.isNaN(expiresMs)) return true
  return expiresMs <= nowMs
}

export function isValidSyncStorageKey(key: string): boolean {
  if (!key || key.startsWith(GOSPEL_SYNC_KEY_PREFIX)) return false
  return isGospelLocalUserDataImportKey(key)
}

export function assertSyncEntrySize(plaintextLength: number): void {
  if (plaintextLength > SYNC_MAX_VALUE_BYTES) {
    throw new Error(`Sync value exceeds ${SYNC_MAX_VALUE_BYTES} bytes`)
  }
}

export function assertSyncKeyCount(count: number): void {
  if (count > SYNC_MAX_KEYS_PER_GROUP) {
    throw new Error(`Sync group exceeds ${SYNC_MAX_KEYS_PER_GROUP} keys`)
  }
}

export interface SyncKeyEntryInput {
  key: string
  ciphertext?: string
  updatedAt: string
  contentHash?: string
  deleted?: boolean
}

export function parseSyncKeyEntries(raw: unknown): SyncKeyEntryInput[] {
  if (!Array.isArray(raw)) {
    throw new Error('Invalid entries')
  }
  const entries: SyncKeyEntryInput[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('Invalid entry')
    }
    const o = item as Record<string, unknown>
    const key = typeof o.key === 'string' ? o.key.trim() : ''
    const updatedAt = typeof o.updatedAt === 'string' ? o.updatedAt.trim() : ''
    if (!key || !updatedAt || Number.isNaN(Date.parse(updatedAt))) {
      throw new Error('Invalid entry')
    }
    if (!isValidSyncStorageKey(key)) {
      throw new Error('Invalid storage key')
    }
    const deleted = o.deleted === true
    const ciphertext = typeof o.ciphertext === 'string' ? o.ciphertext : ''
    const contentHash = typeof o.contentHash === 'string' ? o.contentHash : ''
    if (!deleted && !ciphertext) {
      throw new Error('Missing ciphertext')
    }
    if (!deleted && ciphertext.length > SYNC_MAX_VALUE_BYTES * 2) {
      throw new Error('Ciphertext too large')
    }
    entries.push({ key, ciphertext, updatedAt, contentHash, deleted })
  }
  return entries
}
