import { NextRequest, NextResponse } from 'next/server'
import { createDeviceSyncAdminClient } from '@/lib/gospelDeviceSync/deviceSyncSupabase'
import { SYNC_STORAGE_ID_HEADER } from '@/lib/gospelDeviceSync/constants'
import { isValidStorageId } from '@/lib/gospelDeviceSync/serverValidation'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const value = request.headers.get(SYNC_STORAGE_ID_HEADER)?.trim() ?? ''
  if (!isValidStorageId(value)) {
    return NextResponse.json({ error: 'Missing storage id' }, { status: 401 })
  }

  try {
    const admin = createDeviceSyncAdminClient()
    const { data, error } = await admin
      .from('sync_key_entries')
      .select('storage_key, content_hash, updated_at, deleted, ciphertext')
      .eq('storage_id', value)

    if (error) {
      logger.error('[sync/manifest] fetch failed:', error)
      return NextResponse.json({ error: 'Could not load sync manifest' }, { status: 500 })
    }

    const keys: Record<
      string,
      { updatedAt: string; contentHash: string; byteSize: number; deleted: boolean }
    > = {}

    for (const row of data ?? []) {
      keys[row.storage_key] = {
        updatedAt: row.updated_at,
        contentHash: row.content_hash,
        byteSize: row.deleted ? 0 : row.ciphertext.length,
        deleted: row.deleted,
      }
    }

    return NextResponse.json({ keys })
  } catch (e) {
    logger.error('[sync/manifest] unexpected error:', e)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
