import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/adminAuth'
import { issueGrokVoiceCode, listGrokVoiceCodes } from '@/lib/grokVoiceDb'
import { GROK_VOICE_NO_STORE } from '@/lib/grokVoiceAccess'
import { logger } from '@/lib/logger'

function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: GROK_VOICE_NO_STORE })
}

function parseCreate(body: { name?: unknown; expiresInDays?: unknown; maxDevices?: unknown }): {
  name: string
  expiresInDays: number
  maxDevices: number
} | null {
  if (typeof body.name !== 'string') return null
  const name = body.name.trim()
  if (!name || name.length > 120) return null
  const expiresInDays = body.expiresInDays === undefined ? 7 : body.expiresInDays
  const maxDevices = body.maxDevices === undefined ? 3 : body.maxDevices
  if (
    typeof expiresInDays !== 'number' ||
    !Number.isInteger(expiresInDays) ||
    expiresInDays < 1 ||
    expiresInDays > 366
  ) {
    return null
  }
  if (typeof maxDevices !== 'number' || !Number.isInteger(maxDevices) || maxDevices < 1 || maxDevices > 100) {
    return null
  }
  return { name, expiresInDays, maxDevices }
}

export async function GET() {
  const auth = await requireAdminUser()
  if (!auth.ok) return json({ error: auth.error }, auth.status)

  const listed = await listGrokVoiceCodes()
  if (!listed.ok) return json({ error: 'Failed to load Grok voice codes' }, 500)
  return json({ codes: listed.codes })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminUser()
  if (!auth.ok) return json({ error: auth.error }, auth.status)

  let body: { name?: unknown; expiresInDays?: unknown; maxDevices?: unknown } = {}
  try {
    body = (await request.json()) as { name?: unknown; expiresInDays?: unknown; maxDevices?: unknown }
  } catch {
    return json({ error: 'Name is required' }, 400)
  }
  const parsed = parseCreate(body)
  if (!parsed) return json({ error: 'Name is required' }, 400)

  const issued = await issueGrokVoiceCode({ ...parsed, createdBy: auth.userId })
  if (!issued.ok) {
    logger.error('grok voice code create failed', { status: 'error' })
    return json({ error: 'Failed to create Grok voice code' }, 500)
  }
  logger.info('grok voice code created', { codeId: issued.issued.id, status: 'ok' })
  return json(issued.issued, 201)
}
