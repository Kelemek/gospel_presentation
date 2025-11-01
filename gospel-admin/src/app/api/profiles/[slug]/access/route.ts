import { NextResponse } from 'next/server'
import { getProfileAccessList, grantProfileAccess, revokeProfileAccess } from '@/lib/supabase-data-service'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

interface RouteContext {
  params: Promise<{
    slug: string
  }>
}

// GET - Fetch all counselees with access to this profile
export async function GET(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params
    
    // Verify authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get profile to verify ownership/access
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, created_by')
      .eq('slug', slug)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Check if user is admin or profile owner
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = (userProfile as any)?.role === 'admin'
    const isOwner = (profile as any).created_by === user.id

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to manage access for this profile' },
        { status: 403 }
      )
    }

    // Fetch access list
    const accessList = await getProfileAccessList((profile as any).id)
    
    return NextResponse.json({ access: accessList })
  } catch (error: any) {
    logger.error('[API] GET /api/profiles/[slug]/access error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch profile access' },
      { status: 500 }
    )
  }
}

// POST - Grant access to a new counselee
export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params
    const body = await request.json()
    
    // Verify authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validate email
    if (!body.email || typeof body.email !== 'string') {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      )
    }

    const email = body.email.trim().toLowerCase()

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Get profile to verify ownership/access
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, created_by')
      .eq('slug', slug)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Check if user is admin or profile owner
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = (userProfile as any)?.role === 'admin'
    const isOwner = (profile as any).created_by === user.id

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to grant access to this profile' },
        { status: 403 }
      )
    }

    // Grant access
    await grantProfileAccess((profile as any).id, [email], user.id)
    
    logger.debug(`[API] Granted access to ${email} for profile ${slug}`)
    
    return NextResponse.json({ 
      message: 'Counselee access granted successfully',
      email 
    })
  } catch (error: any) {
    logger.error('[API] POST /api/profiles/[slug]/access error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to grant access' },
      { status: 500 }
    )
  }
}

// DELETE - Revoke counselee access
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params
    const body = await request.json()
    
    // Verify authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validate email
    if (!body.email || typeof body.email !== 'string') {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      )
    }

    const email = body.email.trim().toLowerCase()

    // Get profile to verify ownership/access
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, created_by')
      .eq('slug', slug)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Check if user is admin or profile owner
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = (userProfile as any)?.role === 'admin'
    const isOwner = (profile as any).created_by === user.id

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to revoke access to this profile' },
        { status: 403 }
      )
    }

    // Revoke access
    await revokeProfileAccess((profile as any).id, email)
    
    logger.debug(`[API] Revoked access for ${email} from profile ${slug}`)
    
    return NextResponse.json({ 
      message: 'Counselee access revoked successfully',
      email 
    })
  } catch (error: any) {
    logger.error('[API] DELETE /api/profiles/[slug]/access error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to revoke access' },
      { status: 500 }
    )
  }
}
