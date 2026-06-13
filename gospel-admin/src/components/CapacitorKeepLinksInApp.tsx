'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'
import { resolveCapacitorInAppLinkFromEvent } from '@/lib/capacitorKeepLinksInApp'

export { shouldKeepCapacitorLinkInApp } from '@/lib/capacitorKeepLinksInApp'

/**
 * When running in the Capacitor native app, intercepts same-origin link clicks so
 * navigation stays inside the WebView instead of opening the system browser.
 */
export function CapacitorKeepLinksInApp() {
  const router = useRouter()
  const touchHandledHrefRef = useRef<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) return

    const navigateInApp = (href: string) => {
      router.push(href, { scroll: false })
    }

    const intercept = (e: Event): boolean => {
      const resolved = resolveCapacitorInAppLinkFromEvent(e, window.location.href)
      if (!resolved) return false

      e.preventDefault()
      e.stopPropagation()
      navigateInApp(resolved.href)
      return true
    }

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      const resolved = resolveCapacitorInAppLinkFromEvent(e, window.location.href)
      if (!resolved) return
      e.preventDefault()
      e.stopPropagation()
      navigateInApp(resolved.href)
      touchHandledHrefRef.current = resolved.href
      window.setTimeout(() => {
        touchHandledHrefRef.current = null
      }, 500)
    }

    const handleClick = (e: MouseEvent) => {
      const resolved = resolveCapacitorInAppLinkFromEvent(e, window.location.href)
      // Suppress only the synthetic click that follows touchstart on the same link.
      if (resolved && touchHandledHrefRef.current === resolved.href) {
        e.preventDefault()
        e.stopPropagation()
        return
      }
      if (!resolved) return
      intercept(e)
    }

    const touchStartListenerOptions: AddEventListenerOptions = {
      capture: true,
      passive: false,
    }
    document.addEventListener('touchstart', handleTouchStart, touchStartListenerOptions)
    document.addEventListener('click', handleClick, true)
    return () => {
      document.removeEventListener('touchstart', handleTouchStart, touchStartListenerOptions)
      document.removeEventListener('click', handleClick, true)
    }
  }, [router])

  return null
}
