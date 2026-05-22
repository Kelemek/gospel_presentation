import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { sortHenryBooksByCanonOrder } from '@/lib/henry/henrySlug'
import {
  profileIdsFromPassageIndexLookup,
  publicProfilesByIdsAndSlugPrefix,
} from '@/lib/spurgeon/spurgeonPassageIndexLookup'

/**
 * GET /api/henry/by-reference?reference=John+3:16
 * Returns public Matthew Henry commentary book profiles indexed on that passage (canon order).
 */
export async function GET(request: NextRequest) {
  try {
    const ref = (new URL(request.url).searchParams.get('reference') || '').trim()
    if (!ref) {
      return NextResponse.json({ error: 'reference is required' }, { status: 400 })
    }

    const admin = createAdminClient()
    const ids = await profileIdsFromPassageIndexLookup(admin, ref, { slugPrefix: 'mh' })
    if (ids.length === 0) {
      return NextResponse.json({ items: [] })
    }

    const profiles = await publicProfilesByIdsAndSlugPrefix(admin, ids, 'mh')
    const sorted = sortHenryBooksByCanonOrder(profiles)
    const items = sorted.map((p) => ({
      slug: p.slug,
      title: p.title || p.slug,
    }))

    return NextResponse.json({ items })
  } catch (e) {
    logger.error('[API] GET /api/henry/by-reference', e)
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }
}
