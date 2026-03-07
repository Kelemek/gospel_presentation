'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'

const IN_APP_PATHS = ['/privacy', '/copyright']

/**
 * When running in the Capacitor native app, intercepts clicks on links to
 * /privacy and /copyright so they always navigate inside the WebView instead
 * of opening in the system browser.
 */
export function CapacitorKeepLinksInApp() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) return

    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement)?.closest?.('a')
      if (!anchor || !anchor.href) return

      try {
        const url = new URL(anchor.href)
        const sameOrigin =
          url.origin === window.location.origin ||
          url.host === window.location.host
        const pathname = url.pathname || '/'
        if (sameOrigin && IN_APP_PATHS.includes(pathname)) {
          e.preventDefault()
          e.stopPropagation()
          router.push(pathname)
        }
      } catch {
        // Ignore invalid URLs
      }
    }

    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [router])

  return null
}
