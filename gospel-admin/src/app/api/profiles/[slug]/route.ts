// API Route: GET /api/profiles/[slug] - Get specific profile
// API Route: PUT /api/profiles/[slug] - Update specific profile
// API Route: DELETE /api/profiles/[slug] - Delete specific profile
import { NextRequest, NextResponse } from 'next/server'
import { GospelProfile, GospelPresentationData } from '@/lib/types'
import { sanitizeProfileForPublic } from '@/lib/profile-service'

// Import the profiles array from the main route (temporary solution)
// In a real app, this would use a database
interface RouteContext {
  params: {
    slug: string
  }
}

// Temporary storage reference (same as in route.ts)
// This is a simplified approach - in production use a proper database
const getProfiles = (): GospelProfile[] => {
  // This is a hack to share state between API routes
  // In production, use a proper database
  const globalRef = global as any
  if (!globalRef.profiles) {
    globalRef.profiles = []
  }
  return globalRef.profiles
}

const setProfiles = (profiles: GospelProfile[]) => {
  const globalRef = global as any
  globalRef.profiles = profiles
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { slug } = params
    const profiles = getProfiles()
    
    // Handle default profile route
    const targetSlug = slug === 'default' ? 'default' : slug
    
    const profile = profiles.find(p => p.slug === targetSlug)
    
    if (!profile) {
      return NextResponse.json(
        { error: `Profile '${slug}' not found` },
        { status: 404 }
      )
    }

    // Increment visit count
    profile.visitCount++
    profile.updatedAt = new Date()
    setProfiles(profiles)

    // For public access, return full profile with gospel data
    // For admin access, you might want different data
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
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { slug } = params
    const profiles = getProfiles()
    
    const profileIndex = profiles.findIndex(p => p.slug === slug)
    
    if (profileIndex === -1) {
      return NextResponse.json(
        { error: `Profile '${slug}' not found` },
        { status: 404 }
      )
    }

    const body = await request.json()
    const existingProfile = profiles[profileIndex]

    // Prevent changing slug or isDefault flag
    const updatedProfile: GospelProfile = {
      ...existingProfile,
      title: body.title || existingProfile.title,
      description: body.description !== undefined ? body.description : existingProfile.description,
      gospelData: body.gospelData || existingProfile.gospelData,
      updatedAt: new Date()
    }

    profiles[profileIndex] = updatedProfile
    setProfiles(profiles)

    return NextResponse.json({ 
      profile: updatedProfile,
      message: 'Profile updated successfully'
    })

  } catch (error) {
    console.error('Error updating profile:', error)
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
    const { slug } = params
    const profiles = getProfiles()
    
    const profileIndex = profiles.findIndex(p => p.slug === slug)
    
    if (profileIndex === -1) {
      return NextResponse.json(
        { error: `Profile '${slug}' not found` },
        { status: 404 }
      )
    }

    const profile = profiles[profileIndex]

    // Prevent deletion of default profile
    if (profile.isDefault) {
      return NextResponse.json(
        { error: 'Cannot delete the default profile' },
        { status: 403 }
      )
    }

    profiles.splice(profileIndex, 1)
    setProfiles(profiles)

    return NextResponse.json({ 
      message: `Profile '${slug}' deleted successfully`
    })

  } catch (error) {
    console.error('Error deleting profile:', error)
    return NextResponse.json(
      { error: 'Failed to delete profile' },
      { status: 500 }
    )
  }
}