// API Route: DELETE /api/users/[id] - Delete a user (admin only)
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id: userIdToDelete } = await params
    const supabase = await createClient()
    
    // Check if current user is admin
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Prevent user from deleting themselves
    if (currentUser.id === userIdToDelete) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
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
        { error: 'Only admins can delete users' },
        { status: 403 }
      )
    }

    // Delete the user using Supabase Admin API
    const { createAdminClient } = await import('@/lib/supabase/server')
    const adminClient = createAdminClient()

    // First, delete all profiles owned by this user
    const { error: profilesError } = await adminClient
      .from('profiles')
      .delete()
      .eq('created_by', userIdToDelete)

    if (profilesError) {
      logger.warn('Failed to delete user profiles:', profilesError)
      // Continue anyway
    }

    // Delete the user profile
    const { error: profileError } = await adminClient
      .from('user_profiles')
      .delete()
      .eq('id', userIdToDelete)

    if (profileError) {
      logger.warn('Failed to delete user profile:', profileError)
      // Continue anyway
    }

    // Delete the auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userIdToDelete)

    if (deleteError) {
      throw deleteError
    }

    logger.info(`Deleted user: ${userIdToDelete}`)

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    })
  } catch (error: any) {
    logger.error('Error deleting user:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete user' },
      { status: 500 }
    )
  }
}
