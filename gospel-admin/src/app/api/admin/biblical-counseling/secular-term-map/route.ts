import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/adminAuth'
import {
  loadBiblicalCounselingSectionTitles,
  loadSecularTermMapFromSupabase,
  saveSecularTermMapToSupabase,
} from '@/lib/biblicalCounseling/secularTermMapDb'
import { parseSecularTermMapForSave } from '@/lib/biblicalCounseling/secularTermMap'
import { logger } from '@/lib/logger'
import type { GospelSection } from '@/lib/types'

export async function GET() {
  const auth = await requireAdminUser()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const [map, sectionTitles] = await Promise.all([
      loadSecularTermMapFromSupabase(),
      loadBiblicalCounselingSectionTitles(),
    ])

    return NextResponse.json({
      map,
      sectionTitles,
    })
  } catch (error) {
    logger.error('[admin/biblical-counseling/secular-term-map] GET error:', error)
    return NextResponse.json({ error: 'Failed to load secular term map' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdminUser()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = (await request.json()) as { map?: unknown }
    if (!body.map) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    let parsed
    try {
      parsed = parseSecularTermMapForSave(body.map)
    } catch {
      return NextResponse.json({ error: 'Invalid secular term map shape' }, { status: 400 })
    }

    const sectionTitleStrings = await loadBiblicalCounselingSectionTitles()
    const sections: GospelSection[] = sectionTitleStrings.map((title, index) => ({
      section: String(index + 1),
      title,
      subsections: [{ title: '', content: '' }],
    }))

    const { map, validationIssues } = await saveSecularTermMapToSupabase(parsed, sections)

    return NextResponse.json({
      success: true,
      map,
      validationIssues,
      sectionTitles: sectionTitleStrings,
    })
  } catch (error) {
    logger.error('[admin/biblical-counseling/secular-term-map] PUT error:', error)
    return NextResponse.json({ error: 'Failed to save secular term map' }, { status: 500 })
  }
}
