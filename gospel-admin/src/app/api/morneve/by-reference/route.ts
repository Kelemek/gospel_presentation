import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { sortMorneveRowsByCalendar } from '@/lib/spurgeon/morneveSlug'
import {
  profileIdsFromPassageIndexLookup,
  publicProfilesByIdsAndSlugPrefix,
} from '@/lib/spurgeon/spurgeonPassageIndexLookup'

/**
 * GET /api/morneve/by-reference?reference=John+3:16
 * Public Morning & Evening day profiles indexed on that passage (calendar order).
 */
export async function GET(request: NextRequest) {
  try {
    const ref = (new URL(request.url).searchParams.get('reference') || '').trim()
    if (!ref) {
      return NextResponse.json({ error: 'reference is required' }, { status: 400 })
    }

    const admin = createAdminClient()
    const ids = await profileIdsFromPassageIndexLookup(admin, ref, { slugPrefix: 'me' })
    const profiles = await publicProfilesByIdsAndSlugPrefix(admin, ids, 'me')
    const sorted = sortMorneveRowsByCalendar(profiles)
    const items = sorted.map((p) => ({
      slug: p.slug,
      title: p.title || p.slug,
    }))

    return NextResponse.json({ items })
  } catch (e) {
    logger.error('[API] GET /api/morneve/by-reference', e)
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }
}
