import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { buildReciteSttKeyterms } from '@/lib/memorizationPracticeUtils'

const XAI_STT_URL = 'https://api.x.ai/v1/stt'
const MAX_BYTES = 10 * 1024 * 1024
const RECITE_MAX_AUDIO_SECONDS = 300
const BYTES_PER_SECOND_ESTIMATE = 8000

function estimateAudioSecondsFromBytes(byteSize: number): number {
  if (byteSize <= 0) return 0
  return Math.min(
    RECITE_MAX_AUDIO_SECONDS,
    Math.max(1, byteSize / BYTES_PER_SECOND_ESTIMATE)
  )
}

function resolveBilledAudioSeconds(clientSeconds: number, byteSize: number): number {
  const fromFile = estimateAudioSecondsFromBytes(byteSize)
  const client = Number.isFinite(clientSeconds) ? Math.max(0, clientSeconds) : 0
  const billable = client > 0 ? Math.min(client, fromFile) : fromFile
  return Math.min(RECITE_MAX_AUDIO_SECONDS, billable)
}

function upstreamErrorMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined
  const record = payload as { error?: unknown; message?: unknown }
  if (typeof record.message === 'string' && record.message.trim()) return record.message.trim()
  if (typeof record.error === 'string' && record.error.trim()) return record.error.trim()
  if (record.error && typeof record.error === 'object') {
    const message = (record.error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message.trim()
  }
  return undefined
}

export async function POST(request: NextRequest) {
  try {
    const xaiKey = process.env.XAI_API_KEY?.trim()
    if (!xaiKey) {
      return NextResponse.json(
        { error: 'Speech transcription is not configured on the server.' },
        { status: 503 }
      )
    }

    const form = await request.formData()
    const audio = form.get('audio')
    const reference = String(form.get('reference') ?? '')
    const audioSecondsRaw = Number(form.get('audio_seconds'))
    const clientAudioSeconds = Number.isFinite(audioSecondsRaw) ? Math.max(0, audioSecondsRaw) : 0

    if (!(audio instanceof File)) {
      return NextResponse.json({ error: 'audio file is required' }, { status: 400 })
    }

    if (audio.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Audio file too large' }, { status: 400 })
    }

    if (audio.size === 0) {
      return NextResponse.json({ error: 'No audio recorded. Try again.' }, { status: 400 })
    }

    const keyterms = buildReciteSttKeyterms(reference)
    const upstream = new FormData()
    upstream.append('language', 'en')
    upstream.append('format', 'false')
    for (const term of keyterms) {
      upstream.append('keyterm', term)
    }
    upstream.append('file', audio, audio.name || 'recording.webm')

    const xaiRes = await fetch(XAI_STT_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${xaiKey}` },
      body: upstream,
    })

    const raw = await xaiRes.text()
    let payload: { text?: string } = {}
    if (raw) {
      try {
        payload = JSON.parse(raw) as { text?: string }
      } catch {
        logger.error('xAI transcription returned non-JSON', { status: xaiRes.status })
        return NextResponse.json({ error: 'Transcription failed' }, { status: 502 })
      }
    }

    if (!xaiRes.ok) {
      logger.error('xAI transcription failed', { status: xaiRes.status, payload })
      return NextResponse.json(
        { error: 'Transcription failed', details: upstreamErrorMessage(payload) },
        { status: 502 }
      )
    }

    const text = String(payload.text ?? '').trim()
    if (!text) {
      return NextResponse.json({ error: 'No speech detected in the recording.' }, { status: 422 })
    }

    const billedAudioSeconds = resolveBilledAudioSeconds(clientAudioSeconds, audio.size)
    logger.info('Recite transcription completed', {
      audioSeconds: billedAudioSeconds,
      audioBytes: audio.size,
    })

    return NextResponse.json({ text })
  } catch (error) {
    logger.error('Recite transcribe error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
