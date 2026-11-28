import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/adminAuth'
import { revokeGrokVoiceDevice } from '@/lib/grokVoiceDb'
import { GROK_VOICE_NO_STORE } from '@/lib/grokVoiceAccess'
import { logger } from '@/lib/logger'

const DEVICE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: GROK_VOICE_NO_STORE })
}

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAdminUser()
  if (!auth.ok) return json({ error: auth.error }, auth.status)

  const { id } = await params
  if (!DEVICE_ID.test(id)) return json({ error: 'Invalid device id' }, 400)

  let body: { revoked?: unknown } = {}
  try {
    body = (await request.json()) as { revoked?: unknown }
  } catch {
    return json({ error: 'revoked must be true' }, 400)
  }
  if (body.revoked !== true) return json({ error: 'revoked must be true' }, 400)

  const result = await revokeGrokVoiceDevice(id)
  if (result === 'missing') return json({ error: 'Not found' }, 404)
  if (result === 'unavailable') {
    logger.error('grok voice device revoke failed', { deviceId: id, status: 'error' })
    return json({ error: 'Failed to revoke Grok voice device' }, 500)
  }
  logger.info('grok voice device revoked', { deviceId: id, status: 'revoked' })
  return json({ revoked: true })
}
