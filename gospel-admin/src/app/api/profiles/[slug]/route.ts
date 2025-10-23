// API Route: GET /api/profiles/[slug] - Get specific profile
// API Route: PUT /api/profiles/[slug] - Update specific profile
// API Route: DELETE /api/profiles/[slug] - Delete specific profile
import { NextRequest, NextResponse } from 'next/server'
import { GospelPresentationData, GospelProfile } from '@/lib/types'
import { sanitizeProfileForPublic } from '@/lib/profile-service'
import {
  getProfileBySlug,
  updateProfile,
  deleteProfile
} from '@/lib/blob-data-service'

interface RouteContext {
  params: Promise<{
    slug: string
  }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { slug } = await params
    
    // Handle default profile route
    const targetSlug = slug === 'default' ? 'default' : slug
    
    const profile = await getProfileBySlug(targetSlug)
    
    if (!profile) {
      return NextResponse.json(
        { error: `Profile '${slug}' not found` },
        { status: 404 }
      )
    }

    // Check if this is an admin request
    const isAdminRequest = request.headers.get('x-admin-request') === 'true'
    
    if (isAdminRequest) {
      // Return full profile for admin editing
      return NextResponse.json({ profile })
    } else {
      // Return sanitized profile for public consumption
      return NextResponse.json({ 
        profile: sanitizeProfileForPublic(profile)
      })
    }

  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params
    const body = await request.json()
    
    console.log(`[API] PUT /api/profiles/${slug}`, { 
      bodyKeys: Object.keys(body),
      title: body.title,
      description: body.description,
      hasGospelData: !!body.gospelData 
    })

    // Only include fields that are actually provided in the request
    const updates: Partial<Omit<GospelProfile, 'id' | 'slug' | 'createdAt'>> = {}
    if (body.title !== undefined) updates.title = body.title
    if (body.description !== undefined) updates.description = body.description
    if (body.gospelData !== undefined) updates.gospelData = body.gospelData

    const updatedProfile = await updateProfile(slug, updates)

    console.log(`[API] Profile updated successfully:`, { 
      slug: updatedProfile.slug,
      title: updatedProfile.title 
    })

    return NextResponse.json(updatedProfile)
  } catch (error) {
    console.error('Error updating profile:', error)
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { slug } = await params

    // Delete the profile using the file-based service
    await deleteProfile(slug)

    return NextResponse.json({ 
      message: `Profile '${slug}' deleted successfully`
    })

  } catch (error) {
    console.error('Error deleting profile:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        )
      }
      if (error.message.includes('Cannot delete the default profile')) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to delete profile' },
      { status: 500 }
    )
  }
}