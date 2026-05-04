import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { canonicalScriptureCacheReference } from '@/lib/api-bible-passage-id'
import { logger } from '@/lib/logger'
import { sortSpurgeonSermonsByDisplayTitleAZ } from '@/lib/spurgeon/sortBySpurgeonSermonSlug'
import {
  spurgeonPassageIndexBroadOrFilter,
  spurgeonPassageKeySpansOverlap,
} from '@/lib/spurgeon/spurgeonPassageKeyMatch'

/**
 * GET /api/spurgeon/by-reference?reference=John+3:16
 * Returns public Spurgeon sermon profiles indexed on that passage key (A–Z by display title).
 */
export async function GET(request: NextRequest) {
  try {
    const ref = (new URL(request.url).searchParams.get('reference') || '').trim()
    if (!ref) {
      return NextResponse.json({ error: 'reference is required' }, { status: 400 })
    }

    const passageKey = canonicalScriptureCacheReference(ref)
    if (!passageKey) {
      return NextResponse.json({ items: [] })
    }

    const admin = createAdminClient()
    let indexRows: { profile_id: string; passage_key?: string }[] | null = null
    const { data: exactRows, error: idxErr } = await admin
      .from('spurgeon_passage_index')
      .select('profile_id')
      .eq('passage_key', passageKey)

    if (idxErr) {
      logger.error('[API] spurgeon by-reference index', { idxErr })
      return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
    }

    indexRows = exactRows || []

    if (indexRows.length === 0) {
      const orFilter = spurgeonPassageIndexBroadOrFilter(passageKey)
      if (orFilter) {
        const { data: broadRows, error: broadErr } = await admin
          .from('spurgeon_passage_index')
          .select('profile_id, passage_key')
          .or(orFilter)

        if (broadErr) {
          logger.error('[API] spurgeon by-reference index broad', { broadErr })
          return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
        }

        indexRows = (broadRows || []).filter((r: { passage_key: string }) =>
          spurgeonPassageKeySpansOverlap(passageKey, r.passage_key)
        )
      }
    }

    const ids = [...new Set((indexRows || []).map((r: { profile_id: string }) => r.profile_id))]
    if (ids.length === 0) {
      return NextResponse.json({ items: [] })
    }

    const { data: profiles, error: profErr } = await admin
      .from('profiles')
      .select('slug,title')
      .in('id', ids)
      .eq('is_public', true)
      .eq('is_template', true)
      .like('slug', 'sg%')

    if (profErr) {
      logger.error('[API] spurgeon by-reference profiles', { profErr })
      return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
    }

    const sorted = sortSpurgeonSermonsByDisplayTitleAZ((profiles || []) as { slug: string; title: string }[])
    const items = sorted.map((p) => ({
      slug: p.slug,
      title: p.title || p.slug,
    }))

    return NextResponse.json({ items })
  } catch (e) {
    logger.error('[API] GET /api/spurgeon/by-reference', e)
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }
}
