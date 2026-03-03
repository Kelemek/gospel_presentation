import { NextResponse } from 'next/server'
import { getPublicTemplateProfiles } from '@/lib/supabase-data-service'
import { logger } from '@/lib/logger'

/**
 * GET /api/profiles/public-templates
 * Returns list of public template profiles for anonymous users (Resources dropdown).
 * No auth required - RLS filters to is_template AND is_public rows.
 */
export async function GET() {
  try {
    const profiles = await getPublicTemplateProfiles()
    logger.debug('[API] GET /api/profiles/public-templates', { count: profiles.length })
    return NextResponse.json({ profiles })
  } catch (error) {
    logger.error('[API] Error fetching public templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch public templates' },
      { status: 500 }
    )
  }
}
