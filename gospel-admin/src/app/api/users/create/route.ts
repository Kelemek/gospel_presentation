// API Route: POST /api/users/create - Create a new user (admin only)
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if current user is admin
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single()

    if (!userProfile || (userProfile as any).role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can create users' },
        { status: 403 }
      )
    }

    // Get request body
    const body = await request.json()
    const { email, role } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    if (!role || !['admin', 'counselor'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "admin" or "counselor"' },
        { status: 400 }
      )
    }

    // Create the user using Supabase Admin API
    // Note: We need to use the admin client to create users
    const { createAdminClient } = await import('@/lib/supabase/server')
    const adminClient = createAdminClient()

    // Create user without password - they'll use magic links
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      email_confirm: true, // Auto-confirm email
    })

    if (createError) {
      throw createError
    }

    if (!newUser.user) {
      throw new Error('User creation failed')
    }

    // Create user profile with specified role
    // The trigger should create it automatically, but let's make sure it has the right role
    const { error: profileError } = await adminClient
      .from('user_profiles')
      // @ts-expect-error - Supabase type inference issue
      .upsert({
        id: newUser.user.id,
        role: role,
        display_name: email,
      })

    if (profileError) {
      logger.warn('Failed to update user profile role:', profileError)
      // Don't fail the request, the trigger will create it with default role
    }

    // Send magic link to new user
    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email)
    
    if (inviteError) {
      logger.warn('Failed to send invite email:', inviteError)
      // Don't fail - user was created successfully
    }

    logger.info(`Created new user: ${email} with role: ${role}`)

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        role,
      },
    })
  } catch (error: any) {
    logger.error('Error creating user:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    )
  }
}
