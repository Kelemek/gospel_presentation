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
        // Check if this is a new counselee invited for a specific profile
        const profileSlug = user.user_metadata?.profile_slug
        const role = user.user_metadata?.role
        
        // If counselee with assigned profile, redirect them there
        if (role === 'counselee' && profileSlug) {
          return NextResponse.redirect(new URL(`/${profileSlug}`, requestUrl.origin))
        }
      }
      
      // Default: redirect to admin dashboard (for admin/counselor users)
      return NextResponse.redirect(new URL('/admin', requestUrl.origin))
    } catch (err) {
      console.error('Exception in auth callback:', err)
      return NextResponse.redirect(new URL('/login?error=Authentication failed', requestUrl.origin))
    }
  }

  // No code provided
  return NextResponse.redirect(new URL('/login?error=No authentication code provided', requestUrl.origin))
}
