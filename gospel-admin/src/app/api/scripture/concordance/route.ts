import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { isConcordanceDataPresent, lookupConcordance } from '@/lib/step-bible-concordance'
import { isStepBibleDataPresent } from '@/lib/step-bible-words'

const HEADERS = { 'Cache-Control': 'private, no-store, must-revalidate' } as const

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const strongs = searchParams.get('strongs')
  const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10) || 0)
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50))

  if (!strongs?.trim()) {
    return NextResponse.json(
      { error: 'strongs is required (e.g. G3339 or H430)' },
      { status: 400, headers: HEADERS }
    )
  }

  if (!isStepBibleDataPresent() || !isConcordanceDataPresent()) {
    return NextResponse.json(
      { error: 'Concordance data is not installed on this server.' },
      { status: 503, headers: HEADERS }
    )
  }

  try {
    const result = lookupConcordance(strongs.trim(), offset, limit)
    if (!result) {
      return NextResponse.json(
        { error: `No concordance entries for ${strongs.trim()}` },
        { status: 404, headers: HEADERS }
      )
    }
    return NextResponse.json(result, { headers: HEADERS })
  } catch (error) {
    logger.error('concordance error:', error)
    return NextResponse.json({ error: 'Failed to load concordance' }, { status: 500, headers: HEADERS })
  }
}
