import { NextRequest, NextResponse } from 'next/server'
import { getProfileUpdatedAt } from '@/lib/supabase-data-service'

/**
 * GET /api/profiles/[slug]/modified
 * Returns only updatedAt for cache validation - avoids full profile fetch when checking if admin updated
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params
    const targetSlug = slug === 'default' ? 'default' : slug

    const updatedAt = await getProfileUpdatedAt(targetSlug)

    if (!updatedAt) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json({
      updatedAt: updatedAt.toISOString()
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
