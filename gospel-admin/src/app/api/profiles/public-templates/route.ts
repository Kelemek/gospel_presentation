import { NextResponse } from 'next/server'
import { getPublicResourcesStructure } from '@/lib/supabase-data-service'
import { logger } from '@/lib/logger'

/**
 * GET /api/profiles/public-templates
 * Returns structured list of public resources (categories + templates) for the Resources dropdown.
 * No auth required - RLS filters to is_template AND is_public rows.
 */
export async function GET() {
  try {
    const items = await getPublicResourcesStructure()
    logger.debug('[API] GET /api/profiles/public-templates', { count: items.length })
    return NextResponse.json({ items })
  } catch (error) {
    logger.error('[API] Error fetching public templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch public templates' },
      { status: 500 }
    )
  }
}
