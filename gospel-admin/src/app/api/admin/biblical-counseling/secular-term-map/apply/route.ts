import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/adminAuth'
import {
  applySecularTermMapToProfile,
  loadSecularTermMapFromSupabase,
} from '@/lib/biblicalCounseling/secularTermMapDb'
import {
  BIBLICAL_COUNSELING_REFERENCE_SLUG,
  BIBLICAL_COUNSELING_SECULAR_MAP_TEST_SLUG,
} from '@/lib/biblicalCounseling/biblicalCounselingReference'
import { logger } from '@/lib/logger'

const ALLOWED_SLUGS = new Set([
  BIBLICAL_COUNSELING_REFERENCE_SLUG,
  BIBLICAL_COUNSELING_SECULAR_MAP_TEST_SLUG,
])

export async function POST(request: NextRequest) {
  const auth = await requireAdminUser()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = (await request.json()) as { slug?: unknown }
    const slug = typeof body.slug === 'string' ? body.slug.trim() : ''
    if (!ALLOWED_SLUGS.has(slug)) {
      return NextResponse.json({ error: 'Invalid profile slug' }, { status: 400 })
    }

    const map = await loadSecularTermMapFromSupabase()
    const { validationIssues } = await applySecularTermMapToProfile(slug, map)

    return NextResponse.json({
      success: true,
      slug,
      validationIssues,
    })
  } catch (error) {
    logger.error('[admin/biblical-counseling/secular-term-map/apply] POST error:', error)
    const message = error instanceof Error ? error.message : 'Failed to apply secular term map'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
