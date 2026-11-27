import { NextRequest, NextResponse } from 'next/server'
import { assertGrokVoiceAccess } from '@/lib/grokVoiceAccess'
import { isGrokVoiceId } from '@/lib/grokTtsVoices'
import { logger } from '@/lib/logger'

const XAI_TTS_URL = 'https://api.x.ai/v1/tts'
const MAX_TEXT_CHARS = 4000
const NO_STORE = { 'Cache-Control': 'no-store' }

type AudioTimestamps = {
  graphChars: string[]
  graphTimes: number[][]
}

function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE })
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
  const access = await assertGrokVoiceAccess()
  if (!access.ok) {
    return json({ error: access.error }, access.status)
  }

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
    return json({
      audio: bytes.toString('base64'),
      contentType: contentType || 'audio/mpeg',
    })
  } catch (error) {
    logger.error('Read-aloud TTS error:', error)
    return json({ error: 'Internal server error' }, 500)
  }
}
