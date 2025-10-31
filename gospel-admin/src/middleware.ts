import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function middleware(request: NextRequest) {
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
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // Redirect to login if not authenticated
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // User is authenticated, allow access
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
