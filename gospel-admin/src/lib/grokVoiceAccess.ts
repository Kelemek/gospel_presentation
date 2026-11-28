import { lookupGrokVoiceToken } from '@/lib/grokVoiceDb'
import { sha256Hex } from '@/lib/grokVoiceCode'
import { GROK_VOICE_TOKEN_HEADER, GROK_VOICE_TOKEN_INVALID } from '@/lib/grokVoiceTokenStorage'

const TOKEN_PATTERN = /^gvt_[A-Za-z0-9_-]{43}$/

export const GROK_VOICE_NO_STORE = { 'Cache-Control': 'no-store' } as const

export type GrokVoiceAccess =
  | { ok: true; xaiKey: string; codeId: string; deviceId: string; tokenHash: string }
  | { ok: false; status: 401; error: string; code: typeof GROK_VOICE_TOKEN_INVALID }
  | { ok: false; status: 503; error: string }

function invalid(): GrokVoiceAccess {
  return { ok: false, status: 401, error: 'Unauthorized', code: GROK_VOICE_TOKEN_INVALID }
}

/** Callers must not put `xaiKey` in a response or a log line. */
export async function assertGrokVoiceAccess(request: Request): Promise<GrokVoiceAccess> {
  const token = request.headers.get(GROK_VOICE_TOKEN_HEADER)?.trim() ?? ''
  if (!TOKEN_PATTERN.test(token)) return invalid()

  const tokenHash = sha256Hex(token)
  const lookup = await lookupGrokVoiceToken(tokenHash)
  if (!lookup.ok && 'unavailable' in lookup) {
    return { ok: false, status: 503, error: 'Grok voice is not available right now.' }
  }
  if (!lookup.ok) return invalid()

  const xaiKey = process.env.XAI_API_KEY?.trim()
  if (!xaiKey) {
    return { ok: false, status: 503, error: 'Grok voice is not configured on the server.' }
  }

  return { ok: true, xaiKey, codeId: lookup.codeId, deviceId: lookup.deviceId, tokenHash }
}
