import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

/**
 * GET /api/spurgeon/sermons?q=&page=&pageSize=
 * Public sermon templates: is_template, is_public, slug prefix sg.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rawQ = (searchParams.get('q') || '').trim()
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1)
    const pageSize = Math.min(50, Math.max(1, Number.parseInt(searchParams.get('pageSize') || '20', 10) || 20))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const admin = createAdminClient()
    let query = admin
      .from('profiles')
      .select('slug,title', { count: 'exact' })
      .eq('is_template', true)
      .eq('is_public', true)
      .like('slug', 'sg%')

    if (rawQ) {
      const stripped = rawQ.replace(/%/g, '').replace(/_/g, '').replace(/,/g, '').replace(/"/g, '').trim()
      if (stripped) {
        const pattern = `%${stripped}%`
        query = query.or(`title.ilike."${pattern}",slug.ilike."${pattern}"`)
      }
    }

    const { data, error, count } = await query.order('slug').range(from, to)

    if (error) {
      logger.error('[API] GET /api/spurgeon/sermons supabase error', { error })
      return NextResponse.json({ error: 'Failed to load sermons' }, { status: 500 })
    }

    const rows = (data || []) as { slug: string; title: string }[]
    return NextResponse.json({
      items: rows.map((r) => ({ slug: r.slug, title: r.title || r.slug })),
      total: count ?? rows.length,
      page,
      pageSize,
    })
  } catch (e) {
    logger.error('[API] GET /api/spurgeon/sermons', e)
    return NextResponse.json({ error: 'Failed to load sermons' }, { status: 500 })
  }
}
