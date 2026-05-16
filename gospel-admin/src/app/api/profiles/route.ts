import { NextResponse } from 'next/server'
import { getProfiles, createProfile } from '@/lib/supabase-data-service'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { CreateProfileRequest, GospelProfile } from '@/lib/types'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    logger.debug('[API] GET /api/profiles - loading from supabase-data-service')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const role = user
      ? ((await createAdminClient().from('user_profiles').select('role').eq('id', user.id).single()).data as { role?: string } | null)?.role
      : null
    const clientForLookups = role === 'admin' ? createAdminClient() : supabase

    const profiles = await getProfiles()

    const usernameMap = new Map<string, string>()
    const allUserIds = new Set<string>()

    profiles.forEach((p: GospelProfile) => {
      if (p.createdBy) {
        allUserIds.add(p.createdBy)
      }
    })

    if (allUserIds.size > 0) {
      const { data: userProfiles } = await clientForLookups
        .from('user_profiles')
        .select('id, username')
        .in('id', Array.from(allUserIds))

      if (userProfiles) {
        userProfiles.forEach((up: { id: string; username: string | null }) => {
          usernameMap.set(up.id, up.username || '')
        })
      }
    }

    const profileList = profiles.map((p: GospelProfile) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description,
      isDefault: p.isDefault,
      isTemplate: p.isTemplate,
      isPublic: p.isPublic ?? false,
      visitCount: p.visitCount,
      lastVisited: p.lastVisited ? (p.lastVisited instanceof Date ? p.lastVisited.toISOString() : p.lastVisited) : undefined,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      createdBy: p.createdBy,
      ownerDisplayName: p.ownerDisplayName,
      ownerUsername: p.createdBy ? (usernameMap.get(p.createdBy) || p.ownerDisplayName) : undefined,
    }))

    logger.debug('[API] Returning profiles:', profileList.map((p) => ({ slug: p.slug })))

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

    if (!body.title) {
      return NextResponse.json(
        { error: 'Missing required field: title' },
        { status: 400 }
      )
    }

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

  } catch (error: unknown) {
    logger.error('[API] POST /api/profiles error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create profile'
    const httpStatus =
      error &&
      typeof error === 'object' &&
      'httpStatus' in error &&
      typeof (error as { httpStatus?: unknown }).httpStatus === 'number'
        ? (error as { httpStatus: number }).httpStatus
        : 500
    return NextResponse.json({ error: message }, { status: httpStatus })
  }
}
