// API Route: GET /api/profiles - List all profiles
// API Route: POST /api/profiles - Create new profile
import { NextRequest, NextResponse } from 'next/server'
import { 
  GospelProfile, 
  CreateProfileRequest, 
  GospelPresentationData 
} from '@/lib/types'
import { 
  validateCreateProfileRequest, 
  createProfileFromRequest,
  ProfileValidationError 
} from '@/lib/profile-service'
import { readFile } from 'fs/promises'
import path from 'path'

// Temporary storage using global reference (replace with database later)
const getProfiles = (): GospelProfile[] => {
  const globalRef = global as any
  if (!globalRef.profiles) {
    globalRef.profiles = []
  }
  return globalRef.profiles
}

const setProfiles = (profiles: GospelProfile[]) => {
  const globalRef = global as any
  globalRef.profiles = profiles
  if (!globalRef.nextId) {
    globalRef.nextId = profiles.length + 1
  }
}

const getNextId = (): number => {
  const globalRef = global as any
  if (!globalRef.nextId) {
    globalRef.nextId = 1
  }
  return globalRef.nextId++
}

// Load gospel data from JSON file
async function loadGospelData(): Promise<GospelPresentationData> {
  try {
    const filePath = path.join(process.cwd(), '..', 'data', 'gospel-presentation.json')
    const fileContent = await readFile(filePath, 'utf-8')
    return JSON.parse(fileContent)
  } catch (error) {
    console.error('Error loading gospel data from file:', error)
    // Return minimal fallback data
    return [
      {
        "section": "1",
        "title": "God",
        "subsections": [
          {
            "title": "A. God is Holy",
            "content": "God is separate from and exalted above His creation. He is morally pure, perfect, and untainted by sin.",
            "scriptureReferences": [
              { "reference": "Isaiah 6:3", "favorite": true },
              { "reference": "1 Peter 1:15-16" }
            ]
          }
        ]
      }
    ]
  }
}

// Initialize with default profile if empty
async function ensureDefaultProfile() {
  const profiles = getProfiles()
  if (profiles.length === 0) {
    try {
      // Load gospel data from JSON file
      const gospelData = await loadGospelData()
      const defaultProfile: GospelProfile = {
        id: '1',
        slug: 'default',
        title: 'Default Gospel Presentation',
        description: 'The original gospel presentation',
        gospelData,
        isDefault: true,
        visitCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      setProfiles([defaultProfile])
    } catch (error) {
      console.error('Failed to initialize default profile:', error)
      throw new Error('Failed to initialize profile system')
    }
  }
}

export async function GET() {
  try {
    await ensureDefaultProfile()
    
    const profiles = getProfiles()
    // Return profiles without sensitive data for admin list view
    const profileList = profiles.map((profile: GospelProfile) => ({
      id: profile.id,
      slug: profile.slug,
      title: profile.title,
      description: profile.description,
      isDefault: profile.isDefault,
      visitCount: profile.visitCount,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt
    }))

    return NextResponse.json({ profiles: profileList })
  } catch (error) {
    console.error('Error fetching profiles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profiles' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDefaultProfile()

    const body: CreateProfileRequest = await request.json()
    const profiles = getProfiles()
    
    // Get existing slugs for validation
    const existingSlugs = profiles.map((p: GospelProfile) => p.slug)
    
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

    // Get source data for cloning
    let sourceGospelData: GospelPresentationData
    
    if (body.cloneFromSlug) {
      const sourceProfile = profiles.find((p: GospelProfile) => p.slug === body.cloneFromSlug)
      if (!sourceProfile) {
        return NextResponse.json(
          { error: `Source profile '${body.cloneFromSlug}' not found` },
          { status: 404 }
        )
      }
      sourceGospelData = sourceProfile.gospelData
    } else {
      // Clone from default profile
      const defaultProfile = profiles.find((p: GospelProfile) => p.isDefault)
      if (!defaultProfile) {
        sourceGospelData = await loadGospelData()
      } else {
        sourceGospelData = defaultProfile.gospelData
      }
    }

    // Create the new profile
    const newProfile: GospelProfile = {
      id: getNextId().toString(),
      ...createProfileFromRequest(body, sourceGospelData)
    }

    profiles.push(newProfile)
    setProfiles(profiles)

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