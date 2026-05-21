import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { lookupLexicon } from '@/lib/step-bible-lexicon'
import { isStepBibleDataPresent } from '@/lib/step-bible-words'

const HEADERS = { 'Cache-Control': 'private, no-store, must-revalidate' } as const

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const strongs = searchParams.get('strongs')
  const rawDetail = searchParams.get('detail') || 'brief'
  const detail = rawDetail === 'full' ? 'full' : 'brief'

  if (!strongs?.trim()) {
    return NextResponse.json({ error: 'strongs is required (e.g. G3339 or H430)' }, { status: 400, headers: HEADERS })
  }

  if (!isStepBibleDataPresent()) {
    return NextResponse.json(
      { error: 'Lexicon data is not installed on this server.' },
      { status: 503, headers: HEADERS }
    )
  }

  try {
    const entry = lookupLexicon(strongs.trim(), detail)
    if (!entry) {
      return NextResponse.json(
        { error: `No lexicon entry for ${strongs.trim()}` },
        { status: 404, headers: HEADERS }
      )
    }
    return NextResponse.json(entry, { headers: HEADERS })
  } catch (error) {
    logger.error('lexicon error:', error)
    return NextResponse.json({ error: 'Failed to load lexicon entry' }, { status: 500, headers: HEADERS })
  }
}
