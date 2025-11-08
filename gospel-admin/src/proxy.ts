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
    
    // Prefer getSession() which provides expiry info; fall back to getUser()
    let session: any = null
    let sessionError: any = null

    if (typeof (supabase.auth as any).getSession === 'function') {
      const res = await (supabase.auth as any).getSession()
      session = res?.data?.session
      sessionError = res?.error
    } else if (typeof (supabase.auth as any).getUser === 'function') {
      const resUser = await (supabase.auth as any).getUser()
      const fetchedUser = resUser?.data?.user
      if (fetchedUser) {
        session = { user: fetchedUser, expires_at: null }
        sessionError = null
      }
    }

    // If no valid session or session error, redirect to login
    if (!session || sessionError) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // If we have expiry info, check if expired and redirect to login
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0
    const now = Date.now()

    if (expiresAt && expiresAt < now) {
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
