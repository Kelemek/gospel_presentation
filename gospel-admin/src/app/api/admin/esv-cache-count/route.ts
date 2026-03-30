import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { getScriptureCacheStatsForTranslation } from '@/lib/verse-counter'

export async function GET() {
  try {
    const supabase = await createClient()
    const stats = await getScriptureCacheStatsForTranslation(supabase, 'esv')
    if (stats === null) {
      logger.error('Error counting ESV cache: query failed')
      return NextResponse.json({ error: 'Failed to count cache', count: 0, totalVerses: 0 }, { status: 500 })
    }

    return NextResponse.json({
      count: stats.referenceCount,
      totalVerses: stats.totalVerses,
      verseLimit: stats.verseLimit,
      withinLimit: stats.withinLimit,
    })
  } catch (error) {
    logger.error('ESV cache count error:', error)
    return NextResponse.json({ error: 'Internal server error', count: 0, totalVerses: 0 }, { status: 500 })
  }
}
