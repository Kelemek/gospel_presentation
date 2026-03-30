import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { REMOTE_SCRIPTURE_CACHE_CODES } from '@/lib/bible-translations'
import { getScriptureCacheStatsForTranslation } from '@/lib/verse-counter'

export type ScriptureCacheStatsPayload = {
  translations: Record<
    string,
    { count: number; totalVerses: number; verseLimit: number; withinLimit: boolean }
  >
}

export async function GET() {
  try {
    const supabase = await createClient()
    const translations: ScriptureCacheStatsPayload['translations'] = {}

    for (const code of REMOTE_SCRIPTURE_CACHE_CODES) {
      const stats = await getScriptureCacheStatsForTranslation(supabase, code)
      if (stats === null) {
        logger.error(`Error counting scripture cache for ${code}`)
        return NextResponse.json(
          { error: 'Failed to load cache stats' },
          { status: 500 }
        )
      }
      translations[code] = {
        count: stats.referenceCount,
        totalVerses: stats.totalVerses,
        verseLimit: stats.verseLimit,
        withinLimit: stats.withinLimit,
      }
    }

    return NextResponse.json({ translations } satisfies ScriptureCacheStatsPayload)
  } catch (error) {
    logger.error('Scripture cache stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
