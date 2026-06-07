import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { isCrossReferenceDataPresent, lookupCrossReferences } from '@/lib/cross-references'

const HEADERS = { 'Cache-Control': 'private, no-store, must-revalidate' } as const

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const reference = searchParams.get('reference')
  const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10) || 0)
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50))

  if (!reference?.trim()) {
    return NextResponse.json({ error: 'reference is required' }, { status: 400, headers: HEADERS })
  }

  if (!isCrossReferenceDataPresent()) {
    return NextResponse.json(
      { error: 'Cross-reference data is not installed on this server.' },
      { status: 503, headers: HEADERS }
    )
  }

  try {
    const result = lookupCrossReferences(reference.trim(), offset, limit)
    if (!result) {
      return NextResponse.json(
        { error: `No cross references for ${reference.trim()}` },
        { status: 404, headers: HEADERS }
      )
    }
    return NextResponse.json(result, { headers: HEADERS })
  } catch (error) {
    logger.error('cross-references error:', error)
    return NextResponse.json({ error: 'Failed to load cross references' }, { status: 500, headers: HEADERS })
  }
}
