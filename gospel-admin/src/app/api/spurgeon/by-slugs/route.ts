import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { isSpurgeonSermonProfileSlug, sortSpurgeonSermonsByDisplayTitleAZ } from '@/lib/spurgeon/sortBySpurgeonSermonSlug'

const MAX_SLUGS = 200

/**
 * GET /api/spurgeon/by-slugs?slugs=sg00001,sg00002
 * Returns public sermon template rows for the given slugs (A–Z by display title). Unknown or non-public slugs are omitted.
 */
export async function GET(request: NextRequest) {
  try {
    const raw = (new URL(request.url).searchParams.get('slugs') || '').trim()
    if (!raw) {
      return NextResponse.json({ items: [] })
    }

    const unique = [...new Set(raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean))].filter((s) =>
      isSpurgeonSermonProfileSlug(s)
    )

    const slugs = unique.slice(0, MAX_SLUGS)
    if (slugs.length === 0) {
      return NextResponse.json({ items: [] })
    }

    const admin = createAdminClient()
    const { data: profiles, error } = await admin
      .from('profiles')
      .select('slug,title')
      .in('slug', slugs)
      .eq('is_public', true)
      .eq('is_template', true)

    if (error) {
      logger.error('[API] GET /api/spurgeon/by-slugs profiles', { error })
      return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
    }

    const sorted = sortSpurgeonSermonsByDisplayTitleAZ((profiles || []) as { slug: string; title: string }[])
    const items = sorted.map((p) => ({
      slug: p.slug,
      title: p.title || p.slug,
    }))

    return NextResponse.json({ items })
  } catch (e) {
    logger.error('[API] GET /api/spurgeon/by-slugs', e)
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }
}
