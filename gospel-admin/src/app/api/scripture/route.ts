import { NextRequest, NextResponse } from 'next/server'
import { fetchScripture, BibleTranslation } from '@/lib/bible-api'
import { logger } from '@/lib/logger'
import { createAdminClient } from '@/lib/supabase/server'

// Cache configuration
const CACHE_TTL_DAYS = 30 // Number of days to keep cached entries

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const reference = searchParams.get('reference')
  const translation = (searchParams.get('translation') || 'esv') as BibleTranslation

  if (!reference) {
    return NextResponse.json({ error: 'Scripture reference is required' }, { status: 400 })
  }

  // Validate translation
  if (translation !== 'esv' && translation !== 'kjv' && translation !== 'nasb') {
    return NextResponse.json({ error: 'Invalid translation. Must be "esv", "kjv", or "nasb"' }, { status: 400 })
  }

  try {
    // Try to use cache (use admin client to bypass RLS)
    const supabase = createAdminClient()
    
    // Check cache first (entries newer than TTL days)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - CACHE_TTL_DAYS)

    const { data: cachedData, error: cacheError } = await supabase
      .from('scripture_cache' as any)
      .select('text')
      .eq('reference', reference)
      .eq('translation', translation)
      .gte('cached_at', cutoffDate.toISOString())
      .maybeSingle()

    if (cachedData && !cacheError) {
      logger.debug(`✅ Cache hit: ${reference} (${translation})`)
      return NextResponse.json(
        { 
          reference,
          text: (cachedData as any).text,
          translation,
          cached: true
        },
        {
          headers: {
            'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800'
          }
        }
      )
    }

    // Cache miss - fetch from external API
    logger.debug(`❌ Cache miss: ${reference} (${translation}) - fetching from API`)
    const result = await fetchScripture(reference, translation)
    
    // Store in cache (upsert to handle duplicates)
    const { error: insertError } = await (supabase
      .from('scripture_cache' as any)
      .upsert as any)(
        {
          reference,
          translation,
          text: result.text,
          cached_at: new Date().toISOString()
        },
        {
          onConflict: 'reference,translation'
        }
      )

    if (insertError) {
      logger.error('Failed to cache scripture:', insertError)
      // Continue anyway - caching failure shouldn't break the request
    } else {
      logger.info(`💾 Cached: ${reference} (${translation})`)
    }
    
    return NextResponse.json(
      { 
        reference: result.reference,
        text: result.text,
        translation: result.translation,
        cached: false
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800'
        }
      }
    )
  } catch (error) {
  logger.error('Scripture API error:', error)
    // Preserve specific error messages and map them to expected HTTP status codes
    if (error instanceof Error) {
      const msg = error.message || 'Failed to fetch scripture text'
      if (/ESV API token not configured/i.test(msg)) {
        return NextResponse.json({ error: msg }, { status: 500 })
      }
      if (/Scripture text not found/i.test(msg)) {
        return NextResponse.json({ error: msg }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch scripture text', details: msg }, { status: 500 })
    }
    // Non-Error thrown values (e.g. throw 'boom') should return a stable details message
    return NextResponse.json({ error: 'Failed to fetch scripture text', details: 'Unknown error' }, { status: 500 })
  }
}