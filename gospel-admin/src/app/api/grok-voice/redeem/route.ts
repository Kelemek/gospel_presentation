import { NextRequest, NextResponse } from 'next/server'
import { generateGrokVoiceToken, normalizeGrokVoiceCode, sha256Hex } from '@/lib/grokVoiceCode'
import {
  GROK_REDEEM_FAILURE_BUCKET,
  GROK_REDEEM_FAILURE_MAX,
  GROK_REDEEM_FAILURE_WINDOW_SECONDS,
  GROK_REDEEM_IP_MAX,
  GROK_REDEEM_IP_WINDOW_SECONDS,
  consumeGrokVoiceRateLimit,
  grokRedeemIpBucket,
  grokVoiceRateLimitOpen,
  redeemGrokVoiceCode,
} from '@/lib/grokVoiceDb'
import { GROK_VOICE_NO_STORE } from '@/lib/grokVoiceAccess'
import { getClientIp } from '@/lib/gospelDeviceSync/serverRateLimit'
import { logger } from '@/lib/logger'

function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: GROK_VOICE_NO_STORE })
}

function deviceLabel(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().slice(0, 80)
  return trimmed || null
}

export async function POST(request: NextRequest) {
  const gate = await grokVoiceRateLimitOpen(
    GROK_REDEEM_FAILURE_BUCKET,
    GROK_REDEEM_FAILURE_MAX,
    GROK_REDEEM_FAILURE_WINDOW_SECONDS
  )
  if (!gate.ok) return json({ error: 'Grok voice is not available right now.' }, 503)
  if (!gate.allowed) return json({ error: 'Try again later.' }, 429)

  const ipLimit = await consumeGrokVoiceRateLimit(
    grokRedeemIpBucket(getClientIp(request)),
    GROK_REDEEM_IP_MAX,
    GROK_REDEEM_IP_WINDOW_SECONDS
  )
  if (!ipLimit.ok) return json({ error: 'Grok voice is not available right now.' }, 503)
  if (!ipLimit.allowed) return json({ error: 'Try again later.' }, 429)

  let body: { code?: unknown; deviceLabel?: unknown } = {}
  try {
    body = (await request.json()) as { code?: unknown; deviceLabel?: unknown }
  } catch {
    body = {}
  }

  const normalized = typeof body.code === 'string' ? normalizeGrokVoiceCode(body.code) : null
  if (!normalized) {
    const failure = await consumeGrokVoiceRateLimit(
      GROK_REDEEM_FAILURE_BUCKET,
      GROK_REDEEM_FAILURE_MAX,
      GROK_REDEEM_FAILURE_WINDOW_SECONDS
    )
    if (!failure.ok) return json({ error: 'Grok voice is not available right now.' }, 503)
    logger.info('grok voice redeem', { status: 'denied' })
    return json({ error: 'Not found' }, 404)
  }

  const token = generateGrokVoiceToken()
  const redeemed = await redeemGrokVoiceCode({
    codeHash: sha256Hex(normalized),
    tokenHash: sha256Hex(token),
    deviceLabel: deviceLabel(body.deviceLabel),
  })
  if (!redeemed.ok && 'unavailable' in redeemed) {
    return json({ error: 'Grok voice is not available right now.' }, 503)
  }
  if (!redeemed.ok) {
    const failure = await consumeGrokVoiceRateLimit(
      GROK_REDEEM_FAILURE_BUCKET,
      GROK_REDEEM_FAILURE_MAX,
      GROK_REDEEM_FAILURE_WINDOW_SECONDS
    )
    if (!failure.ok) return json({ error: 'Grok voice is not available right now.' }, 503)
    logger.info('grok voice redeem', { status: 'denied' })
    return json({ error: 'Not found' }, 404)
  }

  logger.info('grok voice redeem', {
    codeId: redeemed.codeId,
    deviceId: redeemed.deviceId,
    status: 'ok',
  })
  return json({ token })
}
