import { NextRequest, NextResponse } from 'next/server'
import { resolveApiBiblePassageAudioUrl } from '@/lib/apiBiblePassageAudio'
import { isBibleTranslation, type ApiBibleTranslation, type BibleTranslation } from '@/lib/bible-translations'
import { resolveEsvPassageAudioUrl } from '@/lib/esvPassageAudio'
import { logger } from '@/lib/logger'

/**
 * Redirects to spoken audio for a passage: ESV (passage MP3) or API.Bible (chapter MP3, time-limited URL).
 * Requires the same server env as scripture text (ESV_API_TOKEN, API_BIBLE_KEY, bible IDs).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const reference = searchParams.get('reference')?.trim()
  const rawTranslation = (searchParams.get('translation') ?? 'esv').toLowerCase()

  if (!reference) {
    return NextResponse.json({ error: 'Scripture reference is required' }, { status: 400 })
  }

  if (!isBibleTranslation(rawTranslation)) {
    return NextResponse.json(
      { error: 'Invalid translation. Must be one of: esv, kjv, nasb, lsb, niv, nlt, csb' },
      { status: 400 }
    )
  }

  const translation = rawTranslation as BibleTranslation

  try {
    if (translation === 'esv') {
      const audioUrl = await resolveEsvPassageAudioUrl(reference)
      if (!audioUrl) {
        if (!process.env.ESV_API_TOKEN) {
          return NextResponse.json({ error: 'ESV audio is not configured.' }, { status: 503 })
        }
        return NextResponse.json({ error: 'Could not resolve ESV audio for this passage.' }, { status: 502 })
      }
      return NextResponse.redirect(audioUrl, 302)
    }

    const apiT = translation as ApiBibleTranslation
    const audioUrl = await resolveApiBiblePassageAudioUrl(reference, apiT)
    if (!audioUrl) {
      if (!process.env.API_BIBLE_KEY) {
        return NextResponse.json({ error: 'API.Bible audio is not configured.' }, { status: 503 })
      }
      return NextResponse.json(
        { error: 'No audio is available for this translation or passage, or the chapter could not be loaded.' },
        { status: 404 }
      )
    }
    return NextResponse.redirect(audioUrl, 302)
  } catch (e) {
    logger.error('Scripture audio redirect failed:', e)
    return NextResponse.json({ error: 'Failed to load audio.' }, { status: 502 })
  }
}
