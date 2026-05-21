import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { canonicalScriptureCacheReference } from '@/lib/api-bible-passage-id'
import { logger } from '@/lib/logger'
import { sortCalvinBooksByCanonOrder } from '@/lib/calvin/calvinSlug'
import { sortMorneveRowsByCalendar } from '@/lib/spurgeon/morneveSlug'
import { sortEdwardsSermonsByDisplayTitleAZ } from '@/lib/edwards/edwardsSlug'
import { sortSpurgeonSermonsByDisplayTitleAZ } from '@/lib/spurgeon/sortBySpurgeonSermonSlug'
import {
  profileIdsFromPassageIndexLookup,
  publicProfilesByIdsAndSlugPrefix,
} from '@/lib/spurgeon/spurgeonPassageIndexLookup'

const MAX_ITEMS = 8

/**
 * GET /api/scripture/spurgeon-links?reference=...
 * Indexed Spurgeon sermons, Edwards sermons, Morning & Evening, and Calvin commentaries for scripture modal Study (max 8 combined).
 * Item order: Spurgeon, then Edwards, then morneve, then Calvin (Protestant canon order).
 */
export async function GET(request: NextRequest) {
  try {
    const ref = (new URL(request.url).searchParams.get('reference') || '').trim()
    if (!ref) {
      return NextResponse.json({ error: 'reference is required' }, { status: 400 })
    }

    const passageKey = canonicalScriptureCacheReference(ref)
    if (!passageKey) {
      return NextResponse.json({
        items: [],
        sermonCount: 0,
        edwardsCount: 0,
        morneveCount: 0,
        calvinCount: 0,
      })
    }

    const admin = createAdminClient()
    const [idsSg, idsJe, idsMe, idsCv] = await Promise.all([
      profileIdsFromPassageIndexLookup(admin, ref),
      profileIdsFromPassageIndexLookup(admin, ref, { slugPrefix: 'je' }),
      profileIdsFromPassageIndexLookup(admin, ref, { slugPrefix: 'me' }),
      profileIdsFromPassageIndexLookup(admin, ref, { slugPrefix: 'cv' }),
    ])
    if (idsSg.length === 0 && idsJe.length === 0 && idsMe.length === 0 && idsCv.length === 0) {
      return NextResponse.json({
        items: [],
        sermonCount: 0,
        edwardsCount: 0,
        morneveCount: 0,
        calvinCount: 0,
      })
    }

    const [sermonProfiles, edwardsProfiles, morneveProfiles, calvinProfiles] = await Promise.all([
      publicProfilesByIdsAndSlugPrefix(admin, idsSg, 'sg'),
      publicProfilesByIdsAndSlugPrefix(admin, idsJe, 'je'),
      publicProfilesByIdsAndSlugPrefix(admin, idsMe, 'me'),
      publicProfilesByIdsAndSlugPrefix(admin, idsCv, 'cv'),
    ])

    const sermonSorted = sortSpurgeonSermonsByDisplayTitleAZ(sermonProfiles)
    const edwardsSorted = sortEdwardsSermonsByDisplayTitleAZ(edwardsProfiles)
    const morneveSorted = sortMorneveRowsByCalendar(morneveProfiles)
    const calvinSorted = sortCalvinBooksByCanonOrder(calvinProfiles)

    const items: { slug: string; title: string; kind: 'sermon' | 'edwards' | 'morneve' | 'calvin' }[] = []
    for (const p of sermonSorted) {
      if (items.length >= MAX_ITEMS) break
      items.push({ slug: p.slug, title: p.title || p.slug, kind: 'sermon' })
    }
    for (const p of edwardsSorted) {
      if (items.length >= MAX_ITEMS) break
      items.push({ slug: p.slug, title: p.title || p.slug, kind: 'edwards' })
    }
    for (const p of morneveSorted) {
      if (items.length >= MAX_ITEMS) break
      items.push({ slug: p.slug, title: p.title || p.slug, kind: 'morneve' })
    }
    for (const p of calvinSorted) {
      if (items.length >= MAX_ITEMS) break
      items.push({ slug: p.slug, title: p.title || p.slug, kind: 'calvin' })
    }

    return NextResponse.json({
      items,
      sermonCount: sermonSorted.length,
      edwardsCount: edwardsSorted.length,
      morneveCount: morneveSorted.length,
      calvinCount: calvinSorted.length,
    })
  } catch (e) {
    logger.error('[API] GET /api/scripture/spurgeon-links', e)
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }
}
