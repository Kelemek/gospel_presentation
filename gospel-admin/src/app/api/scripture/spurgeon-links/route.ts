import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { canonicalScriptureCacheReference } from '@/lib/api-bible-passage-id'
import { logger } from '@/lib/logger'
import { sortMorneveRowsByCalendar } from '@/lib/spurgeon/morneveSlug'
import { sortSpurgeonSermonsByDisplayTitleAZ } from '@/lib/spurgeon/sortBySpurgeonSermonSlug'
import {
  profileIdsFromPassageIndexLookup,
  publicProfilesByIdsAndSlugPrefix,
} from '@/lib/spurgeon/spurgeonPassageIndexLookup'

const MAX_ITEMS = 8

/**
 * GET /api/scripture/spurgeon-links?reference=...
 * Indexed public Spurgeon sermons and Morning & Evening days for scripture modal Study (max 8 combined).
 */
export async function GET(request: NextRequest) {
  try {
    const ref = (new URL(request.url).searchParams.get('reference') || '').trim()
    if (!ref) {
      return NextResponse.json({ error: 'reference is required' }, { status: 400 })
    }

    const passageKey = canonicalScriptureCacheReference(ref)
    if (!passageKey) {
      return NextResponse.json({ items: [], sermonCount: 0, morneveCount: 0 })
    }

    const admin = createAdminClient()
    const ids = await profileIdsFromPassageIndexLookup(admin, ref)
    if (ids.length === 0) {
      return NextResponse.json({ items: [], sermonCount: 0, morneveCount: 0 })
    }

    const [sermonProfiles, morneveProfiles] = await Promise.all([
      publicProfilesByIdsAndSlugPrefix(admin, ids, 'sg'),
      publicProfilesByIdsAndSlugPrefix(admin, ids, 'me'),
    ])

    const sermonSorted = sortSpurgeonSermonsByDisplayTitleAZ(sermonProfiles)
    const morneveSorted = sortMorneveRowsByCalendar(morneveProfiles)

    const items: { slug: string; title: string; kind: 'sermon' | 'morneve' }[] = []
    for (const p of sermonSorted) {
      if (items.length >= MAX_ITEMS) break
      items.push({ slug: p.slug, title: p.title || p.slug, kind: 'sermon' })
    }
    for (const p of morneveSorted) {
      if (items.length >= MAX_ITEMS) break
      items.push({ slug: p.slug, title: p.title || p.slug, kind: 'morneve' })
    }

    return NextResponse.json({
      items,
      sermonCount: sermonSorted.length,
      morneveCount: morneveSorted.length,
    })
  } catch (e) {
    logger.error('[API] GET /api/scripture/spurgeon-links', e)
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }
}
