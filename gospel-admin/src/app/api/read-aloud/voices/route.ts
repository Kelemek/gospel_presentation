import { NextResponse } from 'next/server'
import { assertGrokVoiceAccess } from '@/lib/grokVoiceAccess'
import {
  GROK_TTS_FALLBACK_VOICES,
  parseGrokVoiceList,
  readCachedGrokVoices,
  writeCachedGrokVoices,
} from '@/lib/grokTtsVoices'
import { logger } from '@/lib/logger'

const XAI_VOICES_URL = 'https://api.x.ai/v1/tts/voices'
const NO_STORE = { 'Cache-Control': 'no-store' }

function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE })
}

export async function GET() {
  const access = await assertGrokVoiceAccess()
  if (!access.ok) {
    return json({ error: access.error }, access.status)
  }

  const cached = readCachedGrokVoices()
  if (cached) {
    return json({ voices: cached })
  }

  try {
    const upstream = await fetch(XAI_VOICES_URL, {
      headers: { Authorization: `Bearer ${access.xaiKey}` },
    })
    if (!upstream.ok) {
      logger.error('xAI voice list failed', { status: upstream.status })
      return json({ voices: GROK_TTS_FALLBACK_VOICES, fallback: true })
    }
    const voices = parseGrokVoiceList(await upstream.json())
    if (!voices) {
      return json({ voices: GROK_TTS_FALLBACK_VOICES, fallback: true })
    }
    writeCachedGrokVoices(voices)
    return json({ voices })
  } catch (error) {
    logger.error('Read-aloud voice list error:', error)
    return json({ voices: GROK_TTS_FALLBACK_VOICES, fallback: true })
  }
}
