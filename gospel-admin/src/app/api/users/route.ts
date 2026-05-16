import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import logger from '@/lib/logger'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user role
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    const userRole = (userProfile as any)?.role
    
    // Only admins can list users
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Get all auth users using admin client (has service role key)
    const adminClient = createAdminClient()
    const { data: authData, error: authError2 } = await adminClient.auth.admin.listUsers()
    
    if (authError2) {
      logger.error('[API] Error fetching auth users:', authError2)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }
    
    // Get user profiles using admin client to bypass RLS
    const { data: profiles, error: profilesError } = await adminClient
      .from('user_profiles')
      .select('id, role, username')
    
    if (profilesError) {
      logger.error('[API] Error fetching user profiles:', profilesError)
      return NextResponse.json({ error: 'Failed to fetch user profiles' }, { status: 500 })
    }
    
    // Merge auth data with profile data.
    // Never infer `admin` when `user_profiles.role` is missing — that would mis-label users and
    // invert least-privilege expectations for orphaned auth rows or racey signups.
    const users = authData.users
      .filter((u: any) => u.email)
      .map((u: any) => {
        const profile = profiles?.find((p: any) => p.id === u.id) as { role?: string | null; username?: string | null } | undefined
        const rawRole = profile?.role
        const role =
          rawRole != null && String(rawRole).trim() !== '' ? String(rawRole).trim() : null
        return {
          email: u.email || '',
          role,
          username: profile?.username || u.email?.split('@')[0] || 'user'
        }
      })
    
    return NextResponse.json({ users })
  } catch (error) {
    logger.error('[API] GET /api/users error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
