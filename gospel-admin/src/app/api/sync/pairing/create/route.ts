import { NextRequest, NextResponse } from 'next/server'
import { createDeviceSyncAdminClient } from '@/lib/gospelDeviceSync/deviceSyncSupabase'
import { PAIRING_CODE_TTL_MS } from '@/lib/gospelDeviceSync/constants'
import { isValidPairingCode, isValidStorageId } from '@/lib/gospelDeviceSync/serverValidation'
import { logger } from '@/lib/logger'

function generatePairingCode(): string {
  const n = globalThis.crypto.getRandomValues(new Uint32Array(1))[0]! % 1_000_000
  return String(n).padStart(6, '0')
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { storageId?: unknown }
    const storageId = typeof body.storageId === 'string' ? body.storageId.trim() : ''
    if (!isValidStorageId(storageId)) {
      return NextResponse.json({ error: 'Invalid storage id' }, { status: 400 })
    }

    const admin = createDeviceSyncAdminClient()
    const expiresAt = new Date(Date.now() + PAIRING_CODE_TTL_MS).toISOString()

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generatePairingCode()
      const { error } = await admin.from('pairing_sessions').insert({
        code,
        storage_id: storageId,
        expires_at: expiresAt,
      })
      if (!error) {
        return NextResponse.json({ code, expiresAt })
      }
      if (error.code !== '23505') {
        logger.error('[sync/pairing/create] insert failed:', error)
        return NextResponse.json({ error: 'Could not create pairing code' }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Could not create pairing code' }, { status: 500 })
  } catch (e) {
    logger.error('[sync/pairing/create] unexpected error:', e)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      code?: unknown
      storageId?: unknown
      syncKeyEnvelope?: unknown
    }
    const code = typeof body.code === 'string' ? body.code.trim() : ''
    const storageId = typeof body.storageId === 'string' ? body.storageId.trim() : ''
    const syncKeyEnvelope = typeof body.syncKeyEnvelope === 'string' ? body.syncKeyEnvelope.trim() : ''

    if (!isValidPairingCode(code) || !isValidStorageId(storageId) || !syncKeyEnvelope) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const admin = createDeviceSyncAdminClient()
    const now = new Date().toISOString()
    const { data, error } = await admin
      .from('pairing_sessions')
      .update({ encrypted_sync_key: syncKeyEnvelope })
      .eq('code', code)
      .eq('storage_id', storageId)
      .is('claimed_at', null)
      .gt('expires_at', now)
      .select('id')
      .maybeSingle()

    if (error) {
      logger.error('[sync/pairing/create] envelope update failed:', error)
      return NextResponse.json({ error: 'Could not save pairing envelope' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Pairing code expired or not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    logger.error('[sync/pairing/create] envelope unexpected error:', e)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
