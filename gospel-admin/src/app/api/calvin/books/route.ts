import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { sortCalvinBooksByCanonOrder } from '@/lib/calvin/calvinSlug'

const DEFAULT_PAGE_SIZE = 100
const MAX_PAGE_SIZE = 1000

type CalvinBookRow = { slug: string; title: string }

/**
 * GET /api/calvin/books?q=&page=&pageSize=
 * Public Calvin commentary book profiles (`cv` + USFM), Protestant canon order.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rawQ = (searchParams.get('q') || '').trim()
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1)
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number.parseInt(searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE)
    )
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const admin = createAdminClient()
    let query = admin
      .from('profiles')
      .select('slug, title', { count: 'exact' })
      .eq('is_template', true)
      .eq('is_public', true)
      .ilike('slug', 'cv%')

    if (rawQ.length > 0) {
      const escaped = rawQ.replace(/%/g, '').replace(/_/g, '')
      query = query.ilike('title', `%${escaped}%`)
    }

    const { data, error, count } = await query.order('slug', { ascending: true })

    if (error) {
      logger.error('[API] GET /api/calvin/books supabase error', { error })
      return NextResponse.json({ error: 'Failed to load Calvin commentaries' }, { status: 500 })
    }

    const allRows = ((data ?? []) as CalvinBookRow[]).map((r) => ({
      slug: r.slug,
      title: r.title || r.slug,
    }))
    const sorted = sortCalvinBooksByCanonOrder(allRows)
    const pageRows = sorted.slice(from, to + 1)

    return NextResponse.json({
      items: pageRows,
      total: count ?? sorted.length,
      page,
      pageSize,
    })
  } catch (e) {
    logger.error('[API] GET /api/calvin/books', e)
    return NextResponse.json({ error: 'Failed to load Calvin commentaries' }, { status: 500 })
  }
}
