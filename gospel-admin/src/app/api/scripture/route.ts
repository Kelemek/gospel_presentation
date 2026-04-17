import { NextRequest, NextResponse } from 'next/server'
import { fetchScripture } from '@/lib/bible-api'
import type { BibleTranslation } from '@/lib/bible-translations'
import { isBibleTranslation } from '@/lib/bible-translations'
import { normalizeScriptureCachedText } from '@/lib/api-bible-format'
import { canonicalScriptureCacheReference } from '@/lib/api-bible-passage-id'
import { logger } from '@/lib/logger'
import { createAdminClient } from '@/lib/supabase/server'
import { getTotalCacheVerseCountForTranslation, getTotalEsvCacheVerseCount } from '@/lib/verse-counter'
import { logScriptureAccess, getSessionId } from '@/lib/scripture-logging'

const ESV_CACHE_TTL_DAYS = parseInt(process.env.ESV_CACHE_TTL_DAYS || '30', 10)
const API_BIBLE_CACHE_TTL_DAYS = parseInt(process.env.API_BIBLE_CACHE_TTL_DAYS || '14', 10)

/** Do not HTTP-cache JSON; `scripture_cache` already dedupes. Public max-age was serving stale bodies after fixes. */
const SCRIPTURE_HTTP_HEADERS = { 'Cache-Control': 'private, no-store, must-revalidate' } as const

/** ESV uses its own TTL; every other supported translation is API.Bible-backed and uses the shared cache TTL. */
function cacheTtlDaysForTranslation(translation: BibleTranslation): number {
  return translation === 'esv' ? ESV_CACHE_TTL_DAYS : API_BIBLE_CACHE_TTL_DAYS
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const reference = searchParams.get('reference')
  const rawTranslation = searchParams.get('translation') || 'esv'
  const translation = rawTranslation as BibleTranslation

  if (!reference) {
    return NextResponse.json({ error: 'Scripture reference is required' }, { status: 400 })
  }

  /** Align with `fetchScripture` / `ScriptureResult.reference` (always trimmed) so JSON matches on cache hit vs miss. */
  const normalizedReference = reference.trim()
  if (!normalizedReference) {
    return NextResponse.json({ error: 'Scripture reference is required' }, { status: 400 })
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

  const sessionId = getSessionId(request)
  /** One cache row per passage: USFM id when parseable (e.g. PSA.23.4), else normalized string. */
  const cacheReference = canonicalScriptureCacheReference(normalizedReference)

  try {
    // Every valid translation uses scripture_cache + remote fetch (ESV API or API.Bible; KJV/NASB/LSB may DB-fallback inside fetchScripture).
    const supabase = createAdminClient()
    const ttlDays = cacheTtlDaysForTranslation(translation)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - ttlDays)

    const { data: cachedData, error: cacheError } = await supabase
      .from('scripture_cache' as any)
      .select('text')
      .eq('reference', cacheReference)
      .eq('translation', translation)
      .gte('cached_at', cutoffDate.toISOString())
      .maybeSingle()

    if (cachedData && !cacheError) {
      logger.debug(`✅ Cache hit: ${cacheReference} (${translation}) for request ${normalizedReference}`)

      logScriptureAccess({
        reference: normalizedReference,
        translation,
        sessionId,
        request,
      }).catch((err) => logger.warn('Failed to log scripture access:', err))

      const cachedText = normalizeScriptureCachedText((cachedData as { text: string }).text)

      return NextResponse.json(
        {
          reference: normalizedReference,
          text: cachedText,
          translation,
          cached: true,
        },
        { headers: SCRIPTURE_HTTP_HEADERS }
      )
    }

    logger.debug(`❌ Cache miss: ${normalizedReference} (${translation}) - fetching from remote API`)
    const result = await fetchScripture(normalizedReference, translation)

    const { error: insertError } = await (supabase.from('scripture_cache' as any).upsert as any)(
      {
        reference: cacheReference,
        translation,
        text: result.text,
        cached_at: new Date().toISOString(),
      },
      {
        onConflict: 'reference,translation',
      }
    )

    if (insertError) {
      logger.error('Failed to cache scripture:', insertError)
    } else {
      logger.info(`💾 Cached: ${cacheReference} (${translation}) for request ${normalizedReference}`)

      if (translation === 'esv') {
        const totalVerses = await getTotalEsvCacheVerseCount(supabase)
        const { data: evictedCount, error: lruError } = await (supabase.rpc as any)(
          'enforce_esv_cache_limit',
          {
            p_current_total_verses: totalVerses,
            p_max_verses: 500,
          }
        )
        if (lruError) {
          logger.error('Failed to enforce ESV cache limit:', lruError)
        } else if (evictedCount > 0) {
          logger.info(
            `🗑️ Evicted ${evictedCount} old ESV cache entries (was ${totalVerses} verses, limit 500)`
          )
        }
      } else {
        const totalVerses = await getTotalCacheVerseCountForTranslation(supabase, translation)
        const { data: evictedCount, error: lruError } = await (supabase.rpc as any)(
          'enforce_translation_cache_limit',
          {
            p_translation: translation,
            p_current_total_verses: totalVerses,
            p_max_verses: 500,
          }
        )
        if (lruError) {
          logger.error(`Failed to enforce ${translation} cache limit:`, lruError)
        } else if (evictedCount > 0) {
          logger.info(
            `🗑️ Evicted ${evictedCount} old ${translation} cache entries (was ${totalVerses} verses, limit 500)`
          )
        }
      }
    }

    logScriptureAccess({
      reference: normalizedReference,
      translation,
      sessionId,
      request,
    }).catch((err) => logger.warn('Failed to log scripture access:', err))

    return NextResponse.json(
      {
        reference: normalizedReference,
        text: result.text,
        translation: result.translation,
        cached: false,
      },
      { headers: SCRIPTURE_HTTP_HEADERS }
    )
  } catch (error) {
    logger.error('Scripture API error:', error)
    if (error instanceof Error) {
      const msg = error.message || 'Failed to fetch scripture text'
      if (/ESV API token not configured/i.test(msg)) {
        return NextResponse.json({ error: msg }, { status: 500 })
      }
      if (/API\.Bible key not configured|API\.Bible Bible ID not configured/i.test(msg)) {
        return NextResponse.json({ error: msg }, { status: 500 })
      }
      if (/Scripture text not found|Make sure the translation has been imported/i.test(msg)) {
        return NextResponse.json({ error: msg }, { status: 404 })
      }
      if (/Invalid scripture reference format:/i.test(msg)) {
        return NextResponse.json({ error: msg }, { status: 400 })
      }
      if (/^ESV API error:/i.test(msg)) {
        return NextResponse.json({ error: msg }, { status: 500 })
      }
      if (/^API\.Bible error:/i.test(msg)) {
        return NextResponse.json({ error: msg }, { status: 500 })
      }
      if (/Database error/i.test(msg)) {
        return NextResponse.json({ error: 'Database error occurred', details: msg }, { status: 500 })
      }
      return NextResponse.json(
        { error: 'Failed to fetch scripture text', details: msg },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to fetch scripture text', details: 'Unknown error' },
      { status: 500 }
    )
  }
}
