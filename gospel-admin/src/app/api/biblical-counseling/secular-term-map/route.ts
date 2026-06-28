import { NextResponse } from 'next/server'
import { loadSecularTermMapFromSupabase } from '@/lib/biblicalCounseling/secularTermMapDb'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const map = await loadSecularTermMapFromSupabase()
    return NextResponse.json(map, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    logger.error('[biblical-counseling/secular-term-map] GET error:', error)
    return NextResponse.json({ error: 'Failed to load secular term map' }, { status: 500 })
  }
}
