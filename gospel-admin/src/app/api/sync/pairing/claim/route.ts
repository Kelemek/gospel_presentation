import { NextRequest, NextResponse } from 'next/server'
import { createDeviceSyncAdminClient } from '@/lib/gospelDeviceSync/deviceSyncSupabase'
import { isPairingSessionExpired, isValidPairingCode } from '@/lib/gospelDeviceSync/serverValidation'
import { checkPairingClaimRateLimit, getClientIp } from '@/lib/gospelDeviceSync/serverRateLimit'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    if (!(await checkPairingClaimRateLimit(ip))) {
      return NextResponse.json({ error: 'Too many attempts. Try again in a minute.' }, { status: 429 })
    }

    const body = (await request.json()) as { code?: unknown }
    const code = typeof body.code === 'string' ? body.code.trim() : ''
    if (!isValidPairingCode(code)) {
      return NextResponse.json({ error: 'Enter a 6-digit code' }, { status: 400 })
    }

    const admin = createDeviceSyncAdminClient()
    const { data: session, error: fetchError } = await admin
      .from('pairing_sessions')
      .select('id, storage_id, encrypted_sync_key, expires_at, claimed_at')
      .eq('code', code)
      .maybeSingle()

    if (fetchError) {
      logger.error('[sync/pairing/claim] fetch failed:', fetchError)
      return NextResponse.json({ error: 'Could not claim pairing code' }, { status: 500 })
    }

    if (!session || session.claimed_at || isPairingSessionExpired(session.expires_at)) {
      return NextResponse.json({ error: 'This code has expired or is invalid' }, { status: 404 })
    }
    if (!session.encrypted_sync_key) {
      return NextResponse.json({ error: 'This code is not ready yet. Wait a moment and try again.' }, { status: 409 })
    }

    const { error: deleteError } = await admin.from('pairing_sessions').delete().eq('id', session.id)
    if (deleteError) {
      logger.error('[sync/pairing/claim] delete failed:', deleteError)
      return NextResponse.json({ error: 'Could not claim pairing code' }, { status: 500 })
    }

    return NextResponse.json({
      storageId: session.storage_id,
      syncKeyEnvelope: session.encrypted_sync_key,
    })
  } catch (e) {
    logger.error('[sync/pairing/claim] unexpected error:', e)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
