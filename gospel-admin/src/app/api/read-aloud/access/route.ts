import { NextRequest, NextResponse } from 'next/server'
import { assertGrokVoiceAccess, GROK_VOICE_NO_STORE } from '@/lib/grokVoiceAccess'
import { GROK_VOICE_TOKEN_HEADER } from '@/lib/grokVoiceTokenStorage'

function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: GROK_VOICE_NO_STORE })
}

export async function GET(request: NextRequest) {
  const header = request.headers.get(GROK_VOICE_TOKEN_HEADER)?.trim() ?? ''
  if (!header) return json({ enabled: false })

  const access = await assertGrokVoiceAccess(request)
  if (access.ok) return json({ enabled: true })
  if (access.status === 401) return json({ enabled: false, code: access.code }, 401)
  return json({ enabled: false }, access.status)
}
