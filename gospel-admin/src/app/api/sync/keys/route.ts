import { NextRequest, NextResponse } from 'next/server'
import { createDeviceSyncAdminClient } from '@/lib/gospelDeviceSync/deviceSyncSupabase'
import { SYNC_STORAGE_ID_HEADER } from '@/lib/gospelDeviceSync/constants'
import {
  assertSyncKeyCount,
  isValidStorageId,
  isValidSyncStorageKey,
  parseSyncKeyEntries,
} from '@/lib/gospelDeviceSync/serverValidation'
import { logger } from '@/lib/logger'

function readStorageId(request: NextRequest): string | null {
  const value = request.headers.get(SYNC_STORAGE_ID_HEADER)?.trim() ?? ''
  return isValidStorageId(value) ? value : null
}

interface SyncRow {
  storage_id: string
  storage_key: string
  ciphertext: string
  content_hash: string
  updated_at: string
  deleted: boolean
}

type SyncKeyListRow = Pick<SyncRow, 'storage_key'>

type SyncKeyFetchRow = Pick<SyncRow, 'storage_key' | 'ciphertext' | 'content_hash' | 'updated_at' | 'deleted'>

async function upsertEntries(
  storageId: string,
  entries: ReturnType<typeof parseSyncKeyEntries>,
  replaceAll: boolean
): Promise<NextResponse> {
  const admin = createDeviceSyncAdminClient()

  try {
    assertSyncKeyCount(entries.length)
  } catch {
    return NextResponse.json({ error: 'Too many synced keys' }, { status: 413 })
  }

  for (const entry of entries) {
    const { data: existing, error: fetchError } = await admin
      .from('sync_key_entries')
      .select('updated_at')
      .eq('storage_id', storageId)
      .eq('storage_key', entry.key)
      .maybeSingle()

    if (fetchError) {
      logger.error('[sync/keys] fetch existing failed:', fetchError)
      return NextResponse.json({ error: 'Could not save sync data' }, { status: 500 })
    }

    if (existing && new Date(existing.updated_at).getTime() > new Date(entry.updatedAt).getTime()) {
      continue
    }

    const row: SyncRow = {
      storage_id: storageId,
      storage_key: entry.key,
      ciphertext: entry.deleted ? '' : (entry.ciphertext ?? ''),
      content_hash: entry.deleted ? '' : (entry.contentHash ?? ''),
      updated_at: entry.updatedAt,
      deleted: entry.deleted === true,
    }

    const { error: upsertError } = await admin.from('sync_key_entries').upsert(row, {
      onConflict: 'storage_id,storage_key',
    })

    if (upsertError) {
      logger.error('[sync/keys] upsert failed:', upsertError)
      return NextResponse.json({ error: 'Could not save sync data' }, { status: 500 })
    }
  }

  if (replaceAll) {
    const incomingKeys = new Set(entries.map((e) => e.key))
    const { data: remoteKeys, error: listError } = await admin
      .from('sync_key_entries')
      .select('storage_key')
      .eq('storage_id', storageId)

    if (listError) {
      logger.error('[sync/keys] list for prune failed:', listError)
      return NextResponse.json({ error: 'Could not save sync data' }, { status: 500 })
    }

    const staleKeys: string[] = ((remoteKeys ?? []) as SyncKeyListRow[])
      .map((r) => r.storage_key)
      .filter((key) => !incomingKeys.has(key))

    if (staleKeys.length > 0) {
      const now = new Date().toISOString()
      const tombstones = staleKeys.map((key) => ({
        storage_id: storageId,
        storage_key: key,
        ciphertext: '',
        content_hash: '',
        updated_at: now,
        deleted: true,
      }))
      const { error: tombstoneError } = await admin.from('sync_key_entries').upsert(tombstones, {
        onConflict: 'storage_id,storage_key',
      })
      if (tombstoneError) {
        logger.error('[sync/keys] tombstone failed:', tombstoneError)
        return NextResponse.json({ error: 'Could not save sync data' }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ success: true })
}

export async function GET(request: NextRequest) {
  const storageId = readStorageId(request)
  if (!storageId) {
    return NextResponse.json({ error: 'Missing storage id' }, { status: 401 })
  }

  const keysParam = request.nextUrl.searchParams.get('keys')?.trim() ?? ''
  if (!keysParam) {
    return NextResponse.json({ error: 'Missing keys parameter' }, { status: 400 })
  }

  const keys = keysParam
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)

  if (keys.length === 0 || keys.length > 100) {
    return NextResponse.json({ error: 'Invalid keys parameter' }, { status: 400 })
  }
  if (!keys.every(isValidSyncStorageKey)) {
    return NextResponse.json({ error: 'Invalid storage key' }, { status: 400 })
  }

  try {
    const admin = createDeviceSyncAdminClient()
    const { data, error } = await admin
      .from('sync_key_entries')
      .select('storage_key, ciphertext, content_hash, updated_at, deleted')
      .eq('storage_id', storageId)
      .in('storage_key', keys)

    if (error) {
      logger.error('[sync/keys] fetch failed:', error)
      return NextResponse.json({ error: 'Could not load sync data' }, { status: 500 })
    }

    const entries = ((data ?? []) as SyncKeyFetchRow[]).map((row) => ({
      key: row.storage_key,
      ciphertext: row.ciphertext,
      contentHash: row.content_hash,
      updatedAt: row.updated_at,
      deleted: row.deleted,
    }))

    return NextResponse.json({ entries })
  } catch (e) {
    logger.error('[sync/keys] unexpected error:', e)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function PUT(request: NextRequest) {
  const storageId = readStorageId(request)
  if (!storageId) {
    return NextResponse.json({ error: 'Missing storage id' }, { status: 401 })
  }

  try {
    const body = (await request.json()) as { entries?: unknown }
    const entries = parseSyncKeyEntries(body.entries)
    return upsertEntries(storageId, entries, true)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid request'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function PATCH(request: NextRequest) {
  const storageId = readStorageId(request)
  if (!storageId) {
    return NextResponse.json({ error: 'Missing storage id' }, { status: 401 })
  }

  try {
    const body = (await request.json()) as { entries?: unknown }
    const entries = parseSyncKeyEntries(body.entries)
    if (entries.length === 0) {
      return NextResponse.json({ success: true })
    }
    return upsertEntries(storageId, entries, false)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid request'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
