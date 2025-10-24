import { NextResponse } from 'next/server'
import { getProfiles, createProfile } from '@/lib/data-service'
import type { CreateProfileRequest, GospelProfile } from '@/lib/types'

export async function GET() {
  try {
    console.log('[API] GET /api/profiles - loading from file-data-service')
    
    const profiles = await getProfiles()
    
    // Convert to simplified format for the admin dashboard
    const profileList = profiles.map((p: GospelProfile) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description,
      isDefault: p.isDefault,
      visitCount: p.visitCount,
      lastVisited: p.lastVisited ? p.lastVisited.toISOString() : undefined,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString()
    }))
    
    return NextResponse.json({ profiles: profileList })
  } catch (error) {
    console.error('[API] GET /api/profiles error:', error)
    return NextResponse.json(
      { error: 'Failed to load profiles' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    console.log('[API] POST /api/profiles - creating new profile with persistence')
    
    const body = await request.json() as CreateProfileRequest
    
    // Validate required fields
    if (!body.slug || !body.title) {
      return NextResponse.json(
        { error: 'Missing required fields: slug and title' },
        { status: 400 }
      )
    }
    
    // Create the profile using file-data-service (will persist to file)
    const newProfile = await createProfile(body)
    
    console.log('[API] POST /api/profiles - profile created and saved:', newProfile.slug)
    
    return NextResponse.json({ 
      profile: {
        id: newProfile.id,
        slug: newProfile.slug,
        title: newProfile.title,
        description: newProfile.description,
        isDefault: newProfile.isDefault,
        visitCount: newProfile.visitCount,
        createdAt: newProfile.createdAt.toISOString(),
        updatedAt: newProfile.updatedAt.toISOString()
      },
      message: 'Profile created successfully' 
    })
    
  } catch (error: any) {
    console.error('[API] POST /api/profiles error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create profile' },
      { status: 500 }
    )
  }
}