import { NextRequest, NextResponse } from 'next/server'
import {
  BIBLE_SEARCH_DEFAULT_PAGE_SIZE,
  BIBLE_SEARCH_MIN_QUERY_LENGTH,
  clampBibleSearchPageSize,
  searchBible,
} from '@/lib/bible-search-api'
import { isBibleTranslation, type BibleTranslation } from '@/lib/bible-translations'
import { isTranslationEnabled } from '@/lib/isTranslationEnabled'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() ?? ''
  const rawTranslation = searchParams.get('translation') || 'esv'
  const translation = rawTranslation as BibleTranslation
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const pageSize = clampBibleSearchPageSize(
    parseInt(searchParams.get('pageSize') || String(BIBLE_SEARCH_DEFAULT_PAGE_SIZE), 10) ||
      BIBLE_SEARCH_DEFAULT_PAGE_SIZE
  )

  if (!q) {
    return NextResponse.json({ error: 'Search query is required' }, { status: 400 })
  }

  if (q.length < BIBLE_SEARCH_MIN_QUERY_LENGTH) {
    return NextResponse.json(
      {
        error: `Search query must be at least ${BIBLE_SEARCH_MIN_QUERY_LENGTH} characters`,
      },
      { status: 400 }
    )
  }

  if (!isBibleTranslation(translation)) {
    return NextResponse.json(
      {
        error:
          'Invalid translation. Must be one of: esv, kjv, nasb, lsb, niv, nlt, csb',
      },
      { status: 400 }
    )
  }

  const enabled = await isTranslationEnabled(translation)
  if (!enabled) {
    return NextResponse.json(
      { error: 'This Bible translation is not enabled' },
      { status: 400 }
    )
  }

  try {
    const result = await searchBible(q, translation, page, pageSize)
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, no-store, must-revalidate' },
    })
  } catch (error) {
    logger.error('Bible search API error:', error)
    if (error instanceof Error) {
      const msg = error.message || 'Bible search failed'
      if (/ESV API token not configured/i.test(msg)) {
        return NextResponse.json({ error: msg }, { status: 500 })
      }
      if (/API\.Bible key not configured|API\.Bible Bible ID not configured/i.test(msg)) {
        return NextResponse.json({ error: msg }, { status: 500 })
      }
      if (/^ESV API error:/i.test(msg) || /^API\.Bible error:/i.test(msg)) {
        return NextResponse.json({ error: msg }, { status: 502 })
      }
      return NextResponse.json({ error: 'Bible search failed', details: msg }, { status: 500 })
    }
    return NextResponse.json({ error: 'Bible search failed' }, { status: 500 })
  }
}
