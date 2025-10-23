// API Route: GET /api/profiles - List all profiles
// API Route: POST /api/profiles - Create new profile
import { NextRequest, NextResponse } from 'next/server'
import { 
  CreateProfileRequest
} from '@/lib/types'
import { 
  validateCreateProfileRequest,
  ProfileValidationError 
} from '@/lib/profile-service'
import {
  getProfiles,
  createProfile
} from '@/lib/new-file-data-service'

export async function GET() {
  try {
    console.log('[API] GET /api/profiles - Starting request')
    const profiles = await getProfiles()
    console.log(`[API] GET /api/profiles - Got ${profiles.length} profiles`)
    
    // Return profiles without sensitive data for admin list view
    const profileList = profiles.map(profile => ({
      id: profile.id,
      slug: profile.slug,
      title: profile.title,
      description: profile.description,
      isDefault: profile.isDefault,
      visitCount: profile.visitCount,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt
    }))

    console.log('[API] GET /api/profiles - Returning success response')
    return NextResponse.json({ profiles: profileList })
  } catch (error) {
    console.error('[API] GET /api/profiles - Error fetching profiles:', error)
    console.error('[API] GET /api/profiles - Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Failed to fetch profiles', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateProfileRequest = await request.json()
    
    // Get existing slugs for validation
    const allProfiles = await getProfiles()
    const existingSlugs = allProfiles.map(p => p.slug)
    
    // Validate the request
    const validation = validateCreateProfileRequest(body, existingSlugs)
    
    if (!validation.slug.isValid || !validation.slug.isUnique) {
      return NextResponse.json(
        { error: validation.slug.error || 'Invalid slug' },
        { status: 400 }
      )
    }
    
    if (!validation.title.isValid) {
      return NextResponse.json(
        { error: validation.title.error || 'Invalid title' },
        { status: 400 }
      )
    }

    // Create the new profile using the new multi-file service
    const newProfile = await createProfile(
      body.slug,
      body.title,
      body.description,
      body.cloneFromSlug
    )

    // Return the created profile (without full gospel data to save bandwidth)
    const responseProfile = {
      id: newProfile.id,
      slug: newProfile.slug,
      title: newProfile.title,
      description: newProfile.description,
      isDefault: newProfile.isDefault,
      visitCount: newProfile.visitCount,
      createdAt: newProfile.createdAt,
      updatedAt: newProfile.updatedAt
    }

    return NextResponse.json({ 
      profile: responseProfile,
      message: 'Profile created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating profile:', error)
    
    if (error instanceof ProfileValidationError) {
      return NextResponse.json(
        { error: error.message, field: error.field },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create profile' },
      { status: 500 }
    )
  }
}