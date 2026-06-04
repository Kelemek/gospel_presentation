import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import {
  profileIdsFromPassageIndexLookup,
  publicIndexedBookProfilesByIds,
} from '@/lib/spurgeon/spurgeonPassageIndexLookup'

/**
 * GET /api/books/by-reference?reference=John+3:16
 * Returns public template book profiles (non-library corpora) indexed on that passage (A–Z by title).
 */
export async function GET(request: NextRequest) {
  try {
    const ref = (new URL(request.url).searchParams.get('reference') || '').trim()
    if (!ref) {
      return NextResponse.json({ error: 'reference is required' }, { status: 400 })
    }

    const admin = createAdminClient()
    const ids = await profileIdsFromPassageIndexLookup(admin, ref)
    if (ids.length === 0) {
      return NextResponse.json({ items: [] })
    }

    const profiles = await publicIndexedBookProfilesByIds(admin, ids)
    const items = profiles.map((p) => ({
      slug: p.slug,
      title: p.title || p.slug,
    }))

    return NextResponse.json({ items })
  } catch (e) {
    logger.error('[API] GET /api/books/by-reference', e)
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }
}
