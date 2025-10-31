import { NextResponse } from 'next/server'
import { getProfiles, createProfile } from '@/lib/supabase-data-service'
import type { CreateProfileRequest, GospelProfile } from '@/lib/types'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    logger.debug('[API] GET /api/profiles - loading from supabase-data-service')
    
    const profiles = await getProfiles()
    
    // Convert to simplified format for the admin dashboard
    const profileList = profiles.map((p: GospelProfile) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description,
      isDefault: p.isDefault,
      isTemplate: p.isTemplate,
      visitCount: p.visitCount,
      lastVisited: p.lastVisited ? (p.lastVisited instanceof Date ? p.lastVisited.toISOString() : p.lastVisited) : undefined,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      createdBy: p.createdBy,
      ownerDisplayName: p.ownerDisplayName
    }))
    
    return NextResponse.json({ profiles: profileList })
  } catch (error) {
    logger.error('[API] GET /api/profiles error:', error)
    return NextResponse.json(
      { error: 'Failed to load profiles' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    logger.debug('[API] POST /api/profiles - creating new profile with persistence')
    
    const body = await request.json() as CreateProfileRequest
    
    // Validate required fields
    if (!body.slug || !body.title) {
      return NextResponse.json(
        { error: 'Missing required fields: slug and title' },
        { status: 400 }
      )
    }
    
    // Create the profile in Supabase
    const newProfile = await createProfile(body)
    
    logger.debug('[API] POST /api/profiles - profile created and saved:', newProfile.slug)
    
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