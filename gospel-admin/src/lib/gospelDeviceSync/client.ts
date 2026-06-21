import {
  GOSPEL_LOCAL_USER_DATA_KIND,
  GOSPEL_LOCAL_USER_DATA_SCHEMA_VERSION,
  applyGospelLocalUserDataImport,
  buildGospelLocalUserDataPayload,
  isGospelLocalUserDataImportKey,
} from '@/lib/gospelLocalUserDataBackup'
import { gospelStorageRemove } from '@/lib/gospelClientStorage'
import {
  SYNC_MAX_VALUE_BYTES,
  SYNC_STORAGE_ID_HEADER,
} from '@/lib/gospelDeviceSync/constants'
import {
  decryptSyncValue,
  deriveStorageId,
  encryptSyncValue,
  generateSyncKeyBase64,
  hashSyncPlaintext,
  unwrapSyncKeyFromPairing,
  wrapSyncKeyForPairing,
} from '@/lib/gospelDeviceSync/crypto'
import {
  clearDirtyKeys,
  enableDeviceSyncLocal,
  getDirtyKeys,
  readDeviceSyncEnabled,
  readSyncKeyBase64,
  readSyncKeyVersions,
  withSyncDirtySuppressed,
  writeSyncKeyVersions,
  type SyncKeyVersions,
} from '@/lib/gospelDeviceSync/dirty'

export interface PairingCreateResult {
  code: string
  expiresAt: string
}

export interface PairingClaimResult {
  storageId: string
  syncKeyEnvelope: string
}

export interface SyncManifestEntry {
  updatedAt: string
  contentHash: string
  byteSize: number
  deleted: boolean
}

interface SyncRemoteEntry {
  key: string
  ciphertext: string
  contentHash: string
  updatedAt: string
  deleted: boolean
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Request failed')
  }
  return data
}

export async function ensureSyncKey(): Promise<{ syncKey: string; storageId: string }> {
  let syncKey = readSyncKeyBase64()
  if (!syncKey) {
    syncKey = await generateSyncKeyBase64()
  }
  const storageId = await deriveStorageId(syncKey)
  return { syncKey, storageId }
}

export async function createPairingSession(storageId: string): Promise<PairingCreateResult> {
  return apiJson<PairingCreateResult>('/api/sync/pairing/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storageId }),
  })
}

export async function uploadPairingEnvelope(
  code: string,
  storageId: string,
  syncKeyEnvelope: string
): Promise<void> {
  await apiJson('/api/sync/pairing/create', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, storageId, syncKeyEnvelope }),
  })
}

export async function claimPairingCode(code: string): Promise<PairingClaimResult> {
  return apiJson<PairingClaimResult>('/api/sync/pairing/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
}

export async function fetchPairingCodePending(code: string): Promise<boolean> {
  const data = await apiJson<{ pending: boolean }>(
    `/api/sync/pairing/status?code=${encodeURIComponent(code)}`
  )
  return data.pending === true
}

export async function wrapAndUploadPairingEnvelope(
  syncKey: string,
  storageId: string,
  code: string
): Promise<void> {
  const syncKeyEnvelope = await wrapSyncKeyForPairing(syncKey, code)
  await uploadPairingEnvelope(code, storageId, syncKeyEnvelope)
}

export async function completePairingFromClaim(
  code: string,
  claim: PairingClaimResult
): Promise<void> {
  const syncKey = await unwrapSyncKeyFromPairing(claim.syncKeyEnvelope, code)
  const storageId = await deriveStorageId(syncKey)
  if (storageId !== claim.storageId) {
    throw new Error('Pairing data did not match')
  }
  enableDeviceSyncLocal(syncKey)
  await pullAllRemoteKeys(syncKey, claim.storageId)
}

async function buildEncryptedEntries(
  syncKey: string,
  keys: Record<string, string>,
  deletedKeys: string[] = []
): Promise<
  Array<{
    key: string
    ciphertext: string
    updatedAt: string
    contentHash: string
    deleted?: boolean
  }>
> {
  const now = new Date().toISOString()
  const entries: Array<{
    key: string
    ciphertext: string
    updatedAt: string
    contentHash: string
    deleted?: boolean
  }> = []

  for (const [key, plaintext] of Object.entries(keys)) {
    if (!isGospelLocalUserDataImportKey(key)) continue
    if (plaintext.length > SYNC_MAX_VALUE_BYTES) continue
    const contentHash = await hashSyncPlaintext(plaintext)
    const ciphertext = await encryptSyncValue(plaintext, syncKey)
    entries.push({ key, ciphertext, updatedAt: now, contentHash })
  }

  for (const key of deletedKeys) {
    entries.push({
      key,
      ciphertext: '',
      updatedAt: now,
      contentHash: '',
      deleted: true,
    })
  }

  return entries
}

export async function pushFullSnapshot(syncKey: string, storageId: string): Promise<void> {
  if (typeof window === 'undefined') return
  const payload = await buildGospelLocalUserDataPayload(window.localStorage)
  const entries = await buildEncryptedEntries(syncKey, payload.localStorage)
  await apiJson('/api/sync/keys', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      [SYNC_STORAGE_ID_HEADER]: storageId,
    },
    body: JSON.stringify({ entries }),
  })
  const versions: SyncKeyVersions = {}
  for (const entry of entries) {
    versions[entry.key] = { updatedAt: entry.updatedAt, contentHash: entry.contentHash }
  }
  writeSyncKeyVersions(versions)
  clearDirtyKeys(Object.keys(payload.localStorage))
}

export async function pushDirtyKeys(syncKey: string, storageId: string): Promise<void> {
  if (typeof window === 'undefined') return
  const dirty = getDirtyKeys()
  if (dirty.length === 0) return

  const payload = await buildGospelLocalUserDataPayload(window.localStorage)
  const subset: Record<string, string> = {}
  const deletedKeys: string[] = []
  for (const key of dirty) {
    if (Object.prototype.hasOwnProperty.call(payload.localStorage, key)) {
      subset[key] = payload.localStorage[key]!
    } else if (isGospelLocalUserDataImportKey(key)) {
      deletedKeys.push(key)
    }
  }

  const entries = await buildEncryptedEntries(syncKey, subset, deletedKeys)
  if (entries.length === 0) {
    clearDirtyKeys(dirty)
    return
  }

  await apiJson('/api/sync/keys', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      [SYNC_STORAGE_ID_HEADER]: storageId,
    },
    body: JSON.stringify({ entries }),
  })

  const versions = readSyncKeyVersions()
  for (const entry of entries) {
    versions[entry.key] = { updatedAt: entry.updatedAt, contentHash: entry.contentHash }
  }
  writeSyncKeyVersions(versions)
  clearDirtyKeys(entries.map((e) => e.key))
}

export async function fetchSyncManifest(storageId: string): Promise<Record<string, SyncManifestEntry>> {
  const data = await apiJson<{ keys: Record<string, SyncManifestEntry> }>('/api/sync/manifest', {
    headers: { [SYNC_STORAGE_ID_HEADER]: storageId },
  })
  return data.keys ?? {}
}

async function fetchRemoteEntries(storageId: string, keys: string[]): Promise<SyncRemoteEntry[]> {
  if (keys.length === 0) return []
  const data = await apiJson<{ entries: SyncRemoteEntry[] }>(
    `/api/sync/keys?keys=${encodeURIComponent(keys.join(','))}`,
    { headers: { [SYNC_STORAGE_ID_HEADER]: storageId } }
  )
  return data.entries ?? []
}

export async function applyRemoteEntries(syncKey: string, entries: SyncRemoteEntry[]): Promise<void> {
  if (typeof window === 'undefined' || entries.length === 0) return

  const localStorageMap: Record<string, string> = {}
  const removedKeys: string[] = []
  const versions = readSyncKeyVersions()

  for (const entry of entries) {
    if (entry.deleted) {
      removedKeys.push(entry.key)
      versions[entry.key] = { updatedAt: entry.updatedAt, contentHash: '' }
      continue
    }
    const plaintext = await decryptSyncValue(entry.ciphertext, syncKey)
    localStorageMap[entry.key] = plaintext
    versions[entry.key] = { updatedAt: entry.updatedAt, contentHash: entry.contentHash }
  }

  await withSyncDirtySuppressed(async () => {
    if (Object.keys(localStorageMap).length > 0) {
      await applyGospelLocalUserDataImport(
        {
          kind: GOSPEL_LOCAL_USER_DATA_KIND,
          schemaVersion: GOSPEL_LOCAL_USER_DATA_SCHEMA_VERSION,
          exportedAt: new Date().toISOString(),
          origin: window.location.origin,
          localStorage: localStorageMap,
        },
        window.localStorage
      )
    }
    for (const key of removedKeys) {
      await gospelStorageRemove(key)
      try {
        window.localStorage.removeItem(key)
      } catch {
        /* ignore */
      }
    }
    writeSyncKeyVersions(versions)
  })
}

export async function pullChangedKeys(syncKey: string, storageId: string): Promise<boolean> {
  const manifest = await fetchSyncManifest(storageId)
  const localVersions = readSyncKeyVersions()
  const keysToFetch: string[] = []

  for (const [key, remote] of Object.entries(manifest)) {
    if (remote.deleted) {
      const local = localVersions[key]
      if (!local || new Date(remote.updatedAt).getTime() > new Date(local.updatedAt).getTime()) {
        keysToFetch.push(key)
      }
      continue
    }
    const local = localVersions[key]
    if (!local) {
      keysToFetch.push(key)
      continue
    }
    if (new Date(remote.updatedAt).getTime() > new Date(local.updatedAt).getTime()) {
      keysToFetch.push(key)
      continue
    }
    if (remote.contentHash && local.contentHash && remote.contentHash !== local.contentHash) {
      keysToFetch.push(key)
    }
  }

  if (keysToFetch.length === 0) return false

  const entries: SyncRemoteEntry[] = []
  for (let i = 0; i < keysToFetch.length; i += 50) {
    const chunk = keysToFetch.slice(i, i + 50)
    const batch = await fetchRemoteEntries(storageId, chunk)
    entries.push(...batch)
  }

  await applyRemoteEntries(syncKey, entries)
  return true
}

export async function pullAllRemoteKeys(syncKey: string, storageId: string): Promise<void> {
  const manifest = await fetchSyncManifest(storageId)
  const keys = Object.keys(manifest).filter((key) => !manifest[key]?.deleted)
  const entries: SyncRemoteEntry[] = []
  for (let i = 0; i < keys.length; i += 50) {
    const chunk = keys.slice(i, i + 50)
    const batch = await fetchRemoteEntries(storageId, chunk)
    entries.push(...batch)
  }
  await applyRemoteEntries(syncKey, entries)
}

export async function preparePrimaryDevicePairing(): Promise<{ syncKey: string; storageId: string }> {
  const existing = readSyncKeyBase64()
  if (readDeviceSyncEnabled() && existing) {
    return { syncKey: existing, storageId: await deriveStorageId(existing) }
  }
  const syncKey = await generateSyncKeyBase64()
  return { syncKey, storageId: await deriveStorageId(syncKey) }
}

export function finalizeDeviceSyncEnabled(syncKey: string): void {
  enableDeviceSyncLocal(syncKey)
}

/** @deprecated Use preparePrimaryDevicePairing + finalizeDeviceSyncEnabled */
export async function enableSyncOnThisDevice(): Promise<{ syncKey: string; storageId: string }> {
  const prepared = await preparePrimaryDevicePairing()
  finalizeDeviceSyncEnabled(prepared.syncKey)
  return prepared
}

export { isDeviceSyncActive } from '@/lib/gospelDeviceSync/dirty'
