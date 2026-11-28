import { NextRequest, NextResponse } from 'next/server'
import { assertGrokVoiceAccess, GROK_VOICE_NO_STORE } from '@/lib/grokVoiceAccess'
import {
  GROK_TTS_DEVICE_MAX,
  GROK_TTS_DEVICE_WINDOW_SECONDS,
  GROK_TTS_IP_MAX,
  GROK_TTS_IP_WINDOW_SECONDS,
  consumeGrokVoiceRateLimit,
  grokTtsDeviceBucket,
  grokTtsIpBucket,
  recordGrokVoiceUsage,
} from '@/lib/grokVoiceDb'
import { resolveGrokAudioSeconds, type GrokAudioDuration } from '@/lib/grokVoiceCode'
import { isGrokVoiceId } from '@/lib/grokTtsVoices'
import { getClientIp } from '@/lib/gospelDeviceSync/serverRateLimit'
import { logger } from '@/lib/logger'

const XAI_TTS_URL = 'https://api.x.ai/v1/tts'
const MAX_TEXT_CHARS = 4000
const NO_STORE = GROK_VOICE_NO_STORE

type AudioTimestamps = {
  graphChars: string[]
  graphTimes: number[][]
}

function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE })
}

function accessDenied(access: Extract<Awaited<ReturnType<typeof assertGrokVoiceAccess>>, { ok: false }>): NextResponse {
  if (access.status === 401) return json({ error: access.error, code: access.code }, 401)
  return json({ error: access.error }, access.status)
}

async function enforceSpeechLimit(deviceId: string, ip: string): Promise<NextResponse | null> {
  const deviceLimit = await consumeGrokVoiceRateLimit(
    grokTtsDeviceBucket(deviceId),
    GROK_TTS_DEVICE_MAX,
    GROK_TTS_DEVICE_WINDOW_SECONDS
  )
  if (!deviceLimit.ok) return json({ error: 'Grok voice is not available right now.' }, 503)
  if (!deviceLimit.allowed) return json({ error: 'Grok voice is busy. Try again in a moment.' }, 429)

  const ipLimit = await consumeGrokVoiceRateLimit(grokTtsIpBucket(ip), GROK_TTS_IP_MAX, GROK_TTS_IP_WINDOW_SECONDS)
  if (!ipLimit.ok) return json({ error: 'Grok voice is not available right now.' }, 503)
  if (!ipLimit.allowed) return json({ error: 'Grok voice is busy. Try again in a moment.' }, 429)
  return null
}

async function accountForSpeech(
  access: { tokenHash: string; codeId: string; deviceId: string },
  chars: number,
  duration: GrokAudioDuration
): Promise<void> {
  const recorded = await recordGrokVoiceUsage({
    tokenHash: access.tokenHash,
    chars,
    audioSeconds: duration.seconds,
    estimated: duration.estimated,
  })
  if (!recorded.ok) {
    logger.error('grok voice usage record failed', {
      codeId: access.codeId,
      deviceId: access.deviceId,
      chars,
      status: 'error',
    })
    return
  }
  logger.info('grok voice tts', {
    codeId: access.codeId,
    deviceId: access.deviceId,
    chars,
    status: 'ok',
  })
}

function normalizeTimestamps(payload: unknown): AudioTimestamps | undefined {
  if (!payload || typeof payload !== 'object') return undefined
  const graphChars = (payload as { graph_chars?: unknown }).graph_chars
  const graphTimes = (payload as { graph_times?: unknown }).graph_times
  if (!Array.isArray(graphChars) || !Array.isArray(graphTimes)) return undefined
  const chars = graphChars.filter((char): char is string => typeof char === 'string')
  const times = graphTimes.filter(
    (pair): pair is number[] =>
      Array.isArray(pair) && pair.length >= 2 && pair.every((value) => typeof value === 'number')
  )
  if (chars.length === 0 || times.length === 0) return undefined
  return { graphChars: chars, graphTimes: times }
}

export async function POST(request: NextRequest) {
  const access = await assertGrokVoiceAccess(request)
  if (!access.ok) return accessDenied(access)

  try {
    const body = (await request.json()) as {
      text?: unknown
      voiceId?: unknown
      withTimestamps?: unknown
    }
    if (typeof body.text !== 'string' || body.text.trim().length === 0 || body.text.length > MAX_TEXT_CHARS) {
      return json({ error: 'text must be a string of 1 to 4000 characters' }, 400)
    }
    if (typeof body.voiceId !== 'string' || !isGrokVoiceId(body.voiceId)) {
      return json({ error: 'voiceId is required' }, 400)
    }
    if (typeof body.withTimestamps !== 'boolean') {
      return json({ error: 'withTimestamps must be a boolean' }, 400)
    }

    const limited = await enforceSpeechLimit(access.deviceId, getClientIp(request))
    if (limited) return limited

    const upstream = await fetch(XAI_TTS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access.xaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: body.text,
        voice_id: body.voiceId.toLowerCase(),
        language: 'en',
        with_timestamps: body.withTimestamps,
      }),
    })

    if (!upstream.ok) {
      logger.error('xAI text-to-speech failed', { status: upstream.status })
      const status = upstream.status === 429 ? 429 : 502
      const error = status === 429 ? 'Grok voice is busy. Try again in a moment.' : 'Grok voice failed.'
      return json({ error }, status)
    }

    const contentType = upstream.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const payload = (await upstream.json()) as {
        audio?: unknown
        content_type?: unknown
        audio_timestamps?: unknown
      }
      if (typeof payload.audio !== 'string' || !payload.audio) {
        logger.error('xAI text-to-speech returned JSON without audio', { status: upstream.status })
        return json({ error: 'Grok voice failed.' }, 502)
      }
      const audioTimestamps = normalizeTimestamps(payload.audio_timestamps)
      await accountForSpeech(
        access,
        body.text.length,
        resolveGrokAudioSeconds({
          chars: body.text.length,
          graphTimes: audioTimestamps?.graphTimes,
          audioBytes: Buffer.from(payload.audio, 'base64'),
        })
      )
      return json({
        audio: payload.audio,
        contentType:
          typeof payload.content_type === 'string' && payload.content_type
            ? payload.content_type
            : 'audio/mpeg',
        ...(audioTimestamps ? { audioTimestamps } : {}),
      })
    }

    const bytes = Buffer.from(await upstream.arrayBuffer())
    if (bytes.length === 0) {
      return json({ error: 'Grok voice failed.' }, 502)
    }
    await accountForSpeech(
      access,
      body.text.length,
      resolveGrokAudioSeconds({ chars: body.text.length, audioBytes: new Uint8Array(bytes) })
    )
    return json({
      audio: bytes.toString('base64'),
      contentType: contentType || 'audio/mpeg',
    })
  } catch (error) {
    logger.error('Read-aloud TTS error:', error)
    return json({ error: 'Internal server error' }, 500)
  }
}
