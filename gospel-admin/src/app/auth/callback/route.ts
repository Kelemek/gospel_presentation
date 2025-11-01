import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const error_description = requestUrl.searchParams.get('error_description')

  // Handle errors from Supabase
  if (error) {
    console.error('Auth callback error:', error, error_description)
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error_description || error)}`, requestUrl.origin))
  }

  if (code) {
    try {
      const supabase = await createClient()
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('Error exchanging code for session:', exchangeError)
        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin))
      }
      
      // Get user data to check their role and metadata
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Check the user_profiles table for their actual role
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        
        const role = (userProfile as any)?.role
        
        // If counselee, check how many profiles they have access to
        if (role === 'counselee') {
          // Get all profiles this counselee has access to
          const { data: accessList } = await supabase
            .from('profile_access')
            .select('profile_id, profiles!inner(slug)')
            .eq('user_email', user.email?.toLowerCase() || '')
          
          if (accessList && accessList.length > 0) {
            // If only one profile, redirect directly to it
            if (accessList.length === 1) {
              const profile = accessList[0] as any
              const profileSlug = profile?.profiles?.slug
              if (profileSlug) {
                return NextResponse.redirect(new URL(`/${profileSlug}`, requestUrl.origin))
              }
            } else {
              // Multiple profiles - show them a list to choose from
              // For now, redirect to admin which will show their accessible profiles
              return NextResponse.redirect(new URL('/admin', requestUrl.origin))
            }
          }
          
          // Fallback: check if they were invited for a specific profile (from metadata)
          const profileSlug = user.user_metadata?.profile_slug
          if (profileSlug) {
            return NextResponse.redirect(new URL(`/${profileSlug}`, requestUrl.origin))
          }
        }
      }
      
      // Default: redirect to admin dashboard (for admin/counselor users or counselees without assigned profile)
      return NextResponse.redirect(new URL('/admin', requestUrl.origin))
    } catch (err) {
      console.error('Exception in auth callback:', err)
      return NextResponse.redirect(new URL('/login?error=Authentication failed', requestUrl.origin))
    }
  }

  // No code provided
  return NextResponse.redirect(new URL('/login?error=No authentication code provided', requestUrl.origin))
}
