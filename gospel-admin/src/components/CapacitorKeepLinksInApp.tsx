'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'
import { isCapacitorFullNavigationAnchor } from '@/lib/capacitorClientReload'

/** Same-origin navigations that should stay in the Capacitor WebView (not Safari). */
export function shouldKeepCapacitorLinkInApp(url: URL, currentHref: string): boolean {
  let current: URL
  try {
    current = new URL(currentHref)
  } catch {
    return false
  }

  const sameOrigin =
    url.origin === current.origin || url.host === current.host
  if (!sameOrigin) return false
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false

  // Hash-only anchors on the current page: let the browser scroll.
  if (
    url.pathname === current.pathname &&
    url.search === current.search &&
    Boolean(url.hash)
  ) {
    return false
  }

  return true
}

export function capacitorInAppHref(url: URL): string {
  return `${url.pathname}${url.search}${url.hash}`
}

/**
 * When running in the Capacitor native app, intercepts same-origin link clicks so
 * navigation stays inside the WebView instead of opening the system browser.
 */
export function CapacitorKeepLinksInApp() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) return

    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement)?.closest?.('a')
      if (!anchor || !anchor.href) return
      if (isCapacitorFullNavigationAnchor(anchor)) return

      try {
        const url = new URL(anchor.href)
        if (!shouldKeepCapacitorLinkInApp(url, window.location.href)) return

        e.preventDefault()
        e.stopPropagation()
        router.push(capacitorInAppHref(url))
      } catch {
        // Ignore invalid URLs
      }
    }

    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [router])

  return null
}
