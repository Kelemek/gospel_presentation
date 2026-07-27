import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

const WHISPER_MODEL = 'whisper-1'
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

export async function POST(request: NextRequest) {
  try {
    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return NextResponse.json(
        { error: 'OpenAI transcription is not configured on the server.' },
        { status: 503 }
      )
    }

    const form = await request.formData()
    const audio = form.get('audio')
    const prompt = String(form.get('prompt') ?? '').trim()
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

    const openaiForm = new FormData()
    openaiForm.append('file', audio, audio.name || 'recording.webm')
    openaiForm.append('model', WHISPER_MODEL)
    openaiForm.append('language', 'en')
    openaiForm.append('temperature', '0')
    if (prompt) {
      openaiForm.append('prompt', prompt.slice(0, 800))
    }

    const openaiRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: openaiForm,
    })

    const openaiPayload = (await openaiRes.json()) as { text?: string; error?: { message?: string } }
    if (!openaiRes.ok) {
      logger.error('OpenAI transcription failed:', openaiPayload)
      return NextResponse.json(
        { error: 'Transcription failed', details: openaiPayload?.error?.message },
        { status: 502 }
      )
    }

    const transcript = String(openaiPayload?.text ?? '').trim()
    if (!transcript) {
      return NextResponse.json({ error: 'No speech detected in the recording.' }, { status: 422 })
    }

    const billedAudioSeconds = resolveBilledAudioSeconds(clientAudioSeconds, audio.size)
    logger.info('Recite transcription completed', {
      audioSeconds: billedAudioSeconds,
      audioBytes: audio.size,
    })

    return NextResponse.json({ transcript })
  } catch (error) {
    logger.error('Recite transcribe error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
