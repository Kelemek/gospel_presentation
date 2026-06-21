import { NextRequest, NextResponse } from 'next/server'
import { createDeviceSyncAdminClient } from '@/lib/gospelDeviceSync/deviceSyncSupabase'
import { isPairingSessionExpired, isValidPairingCode } from '@/lib/gospelDeviceSync/serverValidation'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const code = (new URL(request.url).searchParams.get('code') ?? '').trim()
    if (!isValidPairingCode(code)) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    }

    const admin = createDeviceSyncAdminClient()
    const { data: session, error } = await admin
      .from('pairing_sessions')
      .select('expires_at')
      .eq('code', code)
      .maybeSingle()

    if (error) {
      logger.error('[sync/pairing/status] fetch failed:', error)
      return NextResponse.json({ error: 'Could not check pairing code' }, { status: 500 })
    }

    const pending = !!session && !isPairingSessionExpired(session.expires_at)
    return NextResponse.json({ pending })
  } catch (e) {
    logger.error('[sync/pairing/status] unexpected error:', e)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
