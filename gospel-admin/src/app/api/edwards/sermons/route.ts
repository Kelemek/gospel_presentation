import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import {
  EDWARDS_SERMON_SLUG_POSTGREST_MATCH,
  sortEdwardsSermonsByDisplayTitleAZ,
} from '@/lib/edwards/edwardsSlug'

/**
 * GET /api/edwards/sermons?q=&page=&pageSize=
 * Public Edwards sermon templates (`je` + digits slugs), A–Z by title.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1)
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('pageSize') || '100', 10) || 100))

    const admin = createAdminClient()
    let query = admin
      .from('profiles')
      .select('slug,title', { count: 'exact' })
      .eq('is_template', true)
      .eq('is_public', true)
      .filter('slug', 'match', EDWARDS_SERMON_SLUG_POSTGREST_MATCH)

    if (q.length > 0) {
      const pattern = `%${q.replace(/%/g, '').replace(/_/g, '')}%`
      query = query.or(`title.ilike.${pattern},slug.ilike.${pattern}`)
    }

    const { data, error, count } = await query

    if (error) {
      logger.error('[API] GET /api/edwards/sermons', { error })
      return NextResponse.json({ error: 'Failed to load sermons' }, { status: 500 })
    }

    const sorted = sortEdwardsSermonsByDisplayTitleAZ((data || []) as { slug: string; title: string }[])
    const total = count ?? sorted.length
    const from = (page - 1) * pageSize
    const items = sorted.slice(from, from + pageSize).map((r) => ({
      slug: r.slug,
      title: r.title || r.slug,
    }))

    return NextResponse.json({ items, total, page, pageSize })
  } catch (e) {
    logger.error('[API] GET /api/edwards/sermons', e)
    return NextResponse.json({ error: 'Failed to load sermons' }, { status: 500 })
  }
}
