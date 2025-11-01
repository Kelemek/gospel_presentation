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
        
        // If counselee, check if they were invited for a specific profile
        if (role === 'counselee') {
          const profileSlug = user.user_metadata?.profile_slug
          
          if (profileSlug) {
            // Redirect to their assigned profile
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
