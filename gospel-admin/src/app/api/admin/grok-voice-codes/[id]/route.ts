import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/adminAuth'
import { revokeGrokVoiceCode } from '@/lib/grokVoiceDb'
import { GROK_VOICE_NO_STORE } from '@/lib/grokVoiceAccess'
import { logger } from '@/lib/logger'

const CODE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: GROK_VOICE_NO_STORE })
}

interface RouteContext {
  params: Promise<{ id: string }>
}

async function revoke(id: string): Promise<NextResponse> {
  if (!CODE_ID.test(id)) return json({ error: 'Invalid code id' }, 400)

  const result = await revokeGrokVoiceCode(id)
  if (result === 'missing') return json({ error: 'Not found' }, 404)
  if (result === 'unavailable') {
    logger.error('grok voice code revoke failed', { codeId: id, status: 'error' })
    return json({ error: 'Failed to revoke Grok voice code' }, 500)
  }
  logger.info('grok voice code revoked', { codeId: id, status: 'revoked' })
  return json({ revoked: true })
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAdminUser()
  if (!auth.ok) return json({ error: auth.error }, auth.status)
  const { id } = await params
  let body: { revoked?: unknown } = {}
  try {
    body = (await request.json()) as { revoked?: unknown }
  } catch {
    return json({ error: 'revoked must be true' }, 400)
  }
  if (body.revoked !== true) return json({ error: 'revoked must be true' }, 400)
  return revoke(id)
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const auth = await requireAdminUser()
  if (!auth.ok) return json({ error: auth.error }, auth.status)
  const { id } = await params
  return revoke(id)
}
