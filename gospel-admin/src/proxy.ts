import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (
    pathname === '/login' ||
    pathname === '/' ||
    pathname === '/copyright' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/public')
  ) {
    return NextResponse.next()
  }

  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    const supabase = await createClient()
    
    // Get session to validate expiry, not just user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    // If no valid session or session error, redirect to login
    if (!session || sessionError) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    
    // Check if session is expired (Supabase default JWT expiry is 1 hour)
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0
    const now = Date.now()
    
    if (expiresAt && expiresAt < now) {
      // Session expired, redirect to login
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // User is authenticated with valid session, allow access
    return NextResponse.next()
  }

  // Allow all other routes
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
