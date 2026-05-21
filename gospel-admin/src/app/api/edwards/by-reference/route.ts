import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { sortEdwardsSermonsByDisplayTitleAZ } from '@/lib/edwards/edwardsSlug'
import {
  profileIdsFromPassageIndexLookup,
  publicProfilesByIdsAndSlugPrefix,
} from '@/lib/spurgeon/spurgeonPassageIndexLookup'

/**
 * GET /api/edwards/by-reference?reference=John+3:16
 * Returns public Edwards sermon profiles indexed on that passage (A–Z by title).
 */
export async function GET(request: NextRequest) {
  try {
    const ref = (new URL(request.url).searchParams.get('reference') || '').trim()
    if (!ref) {
      return NextResponse.json({ error: 'reference is required' }, { status: 400 })
    }

    const admin = createAdminClient()
    const ids = await profileIdsFromPassageIndexLookup(admin, ref, { slugPrefix: 'je' })
    if (ids.length === 0) {
      return NextResponse.json({ items: [] })
    }

    const profiles = await publicProfilesByIdsAndSlugPrefix(admin, ids, 'je')
    const sorted = sortEdwardsSermonsByDisplayTitleAZ(profiles)
    const items = sorted.map((p) => ({
      slug: p.slug,
      title: p.title || p.slug,
    }))

    return NextResponse.json({ items })
  } catch (e) {
    logger.error('[API] GET /api/edwards/by-reference', e)
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }
}
