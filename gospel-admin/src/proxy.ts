import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isBibleTranslation } from '@/lib/bible-translations'
import {
  GOSPEL_PREFERRED_TRANSLATION_COOKIE,
  GOSPEL_PREFERRED_TRANSLATION_COOKIE_MAX_AGE_SECONDS,
  isKindleReadTranslationPreferenceRoute,
} from '@/lib/kindleReadTranslationPreference'
import {
  GOSPEL_PROFILE_TEXT_SIZE_COOKIE,
  GOSPEL_PROFILE_TEXT_SIZE_COOKIE_MAX_AGE_SECONDS,
  isKindleReadTextSize,
  isKindleReadTextSizePreferenceRoute,
} from '@/lib/kindleReadTextSizePreference'
import { createClient } from '@/lib/supabase/server'

function applyKindleReadTranslationCookie(request: NextRequest): NextResponse | null {
  if (!isKindleReadTranslationPreferenceRoute(request.nextUrl.pathname)) {
    return null
  }

  const translation = request.nextUrl.searchParams.get('translation')?.trim().toLowerCase()
  if (!translation || !isBibleTranslation(translation)) {
    return null
  }

  const response = NextResponse.next()
  response.cookies.set(GOSPEL_PREFERRED_TRANSLATION_COOKIE, translation, {
    path: '/',
    maxAge: GOSPEL_PREFERRED_TRANSLATION_COOKIE_MAX_AGE_SECONDS,
    sameSite: 'lax',
  })
  return response
}

function applyKindleReadTextSizeCookie(request: NextRequest): NextResponse | null {
  if (!isKindleReadTextSizePreferenceRoute(request.nextUrl.pathname)) {
    return null
  }

  const textSize = request.nextUrl.searchParams.get('textSize')?.trim().toLowerCase()
  if (!textSize || !isKindleReadTextSize(textSize)) {
    return null
  }

  const response = NextResponse.next()
  response.cookies.set(GOSPEL_PROFILE_TEXT_SIZE_COOKIE, textSize, {
    path: '/',
    maxAge: GOSPEL_PROFILE_TEXT_SIZE_COOKIE_MAX_AGE_SECONDS,
    sameSite: 'lax',
  })
  return response
}

function applyKindleReadPreferenceCookies(request: NextRequest): NextResponse | null {
  const translationResponse = applyKindleReadTranslationCookie(request)
  const textSizeResponse = applyKindleReadTextSizeCookie(request)

  if (!translationResponse && !textSizeResponse) {
    return null
  }

  const response = translationResponse ?? textSizeResponse!
  const other = translationResponse ? textSizeResponse : null

  if (other) {
    const textSize = request.nextUrl.searchParams.get('textSize')?.trim().toLowerCase()
    if (textSize && isKindleReadTextSize(textSize)) {
      response.cookies.set(GOSPEL_PROFILE_TEXT_SIZE_COOKIE, textSize, {
        path: '/',
        maxAge: GOSPEL_PROFILE_TEXT_SIZE_COOKIE_MAX_AGE_SECONDS,
        sameSite: 'lax',
      })
    }

    const translation = request.nextUrl.searchParams.get('translation')?.trim().toLowerCase()
    if (translation && isBibleTranslation(translation)) {
      response.cookies.set(GOSPEL_PREFERRED_TRANSLATION_COOKIE, translation, {
        path: '/',
        maxAge: GOSPEL_PREFERRED_TRANSLATION_COOKIE_MAX_AGE_SECONDS,
        sameSite: 'lax',
      })
    }
  }

  return response
}

export async function proxy(request: NextRequest) {
  const kindlePreferenceResponse = applyKindleReadPreferenceCookies(request)
  if (kindlePreferenceResponse) {
    return kindlePreferenceResponse
  }

  const { pathname } = request.nextUrl

  // Allow public routes
  if (
    pathname === '/login' ||
    pathname === '/' ||
    pathname === '/copyright' ||
    pathname === '/privacy' ||
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
