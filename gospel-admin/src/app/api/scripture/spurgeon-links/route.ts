import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { canonicalScriptureCacheReference } from '@/lib/api-bible-passage-id'
import { logger } from '@/lib/logger'
import { sortSpurgeonSermonsByDisplayTitleAZ } from '@/lib/spurgeon/sortBySpurgeonSermonSlug'

const MAX_ITEMS = 8

/**
 * GET /api/scripture/spurgeon-links?reference=...
 * Same backing data as by-reference; capped list for scripture modal "Study" links (A–Z by display title, max 8).
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
    const { data: indexRows, error: idxErr } = await admin
      .from('spurgeon_passage_index')
      .select('profile_id')
      .eq('passage_key', passageKey)

    if (idxErr) {
      logger.error('[API] scripture spurgeon-links index', { idxErr })
      return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
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
      logger.error('[API] scripture spurgeon-links profiles', { profErr })
      return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
    }

    const sorted = sortSpurgeonSermonsByDisplayTitleAZ((profiles || []) as { slug: string; title: string }[])
    const items = sorted.slice(0, MAX_ITEMS).map((p) => ({
      slug: p.slug,
      title: p.title || p.slug,
    }))

    return NextResponse.json({ items })
  } catch (e) {
    logger.error('[API] GET /api/scripture/spurgeon-links', e)
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }
}
