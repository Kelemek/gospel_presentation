// API Route: POST /api/profiles/[slug]/visit - Track visit to profile
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { incrementProfileVisitCount } from '@/lib/supabase-data-service'

interface RouteContext {
  params: Promise<{
    slug: string
  }>
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { slug } = await params
    
    // Increment visit count for this profile
    await incrementProfileVisitCount(slug)
    
    return NextResponse.json({ 
      success: true,
      message: `Visit count incremented for profile: ${slug}`
    })

  } catch (error) {
    console.error('Error incrementing visit count:', error)
    
    // Don't return error status - visit tracking shouldn't break the page
    return NextResponse.json(
      { 
        success: false,
        message: 'Visit tracking failed but page should continue to work'
      },
      { status: 200 } // Return 200 so the page doesn't break
    )
  }
}