import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { wordStudyTargetsFromReference } from '@/lib/step-bible-reference'
import { buildWordStudyResult, isStepBibleDataPresent } from '@/lib/step-bible-words'

const HEADERS = { 'Cache-Control': 'private, no-store, must-revalidate' } as const

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const reference = searchParams.get('reference')

  if (!reference?.trim()) {
    return NextResponse.json({ error: 'Scripture reference is required' }, { status: 400, headers: HEADERS })
  }

  const targets = wordStudyTargetsFromReference(reference)
  if (!targets.length) {
    return NextResponse.json(
      {
        error: 'Word study requires a verse reference (e.g. Romans 12:2 or Romans 12:2-4)',
        unavailableReason: 'chapter_or_invalid_reference',
      },
      { status: 400, headers: HEADERS }
    )
  }

  if (!isStepBibleDataPresent()) {
    const message = 'Word study data is not installed on this server.'
    logger.warn('STEPBible word data not found; run npm run import-stepbible')
    return NextResponse.json(
      { ...buildWordStudyResult(targets, message), error: message },
      { status: 503, headers: HEADERS }
    )
  }

  try {
    const result = buildWordStudyResult(targets)
    if (!result.verses.some((v) => v.words.length > 0)) {
      return NextResponse.json(
        buildWordStudyResult(targets, 'No original-language words found for this passage.'),
        { headers: HEADERS }
      )
    }
    return NextResponse.json(result, { headers: HEADERS })
  } catch (error) {
    logger.error('word-study error:', error)
    return NextResponse.json({ error: 'Failed to load word study' }, { status: 500, headers: HEADERS })
  }
}
