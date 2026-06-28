'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'
import {
  capacitorHashAnchorIdFromInAppHref,
  exceedsCapacitorLinkTapMoveThreshold,
  isSameDocumentCapacitorInAppHref,
  resolveCapacitorInAppLinkFromEvent,
  type CapacitorKeepLinksInAppOptions,
} from '@/lib/capacitorKeepLinksInApp'
import { scrollToTocAnchor } from '@/lib/scrollToTocAnchor'

export { shouldKeepCapacitorLinkInApp } from '@/lib/capacitorKeepLinksInApp'

type PendingLinkTouch = {
  href: string
  startX: number
  startY: number
  moved: boolean
}

/**
 * When running in the Capacitor native app, intercepts same-origin link clicks so
 * navigation stays inside the WebView instead of opening the system browser.
 */
export function CapacitorKeepLinksInApp() {
  const router = useRouter()
  const touchHandledHrefRef = useRef<string | null>(null)
  const pendingTouchRef = useRef<PendingLinkTouch | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) return

    const linkOptions: CapacitorKeepLinksInAppOptions = { interceptSamePageHash: true }

    const navigateInApp = (href: string) => {
      if (isSameDocumentCapacitorInAppHref(href, window.location.href)) {
        const anchorId = capacitorHashAnchorIdFromInAppHref(href)
        if (anchorId) {
          scrollToTocAnchor(anchorId, { behavior: 'auto' })
        }
        const hashPart = href.includes('#') ? href.slice(href.indexOf('#')) : ''
        if (hashPart && window.location.hash !== hashPart) {
          router.replace(href, { scroll: false })
        }
        return
      }
      router.push(href, { scroll: false })
    }

    const clearPendingTouch = () => {
      pendingTouchRef.current = null
    }

    const intercept = (e: Event): boolean => {
      const resolved = resolveCapacitorInAppLinkFromEvent(e, window.location.href, linkOptions)
      if (!resolved) return false

      e.preventDefault()
      e.stopPropagation()
      navigateInApp(resolved.href)
      return true
    }

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        clearPendingTouch()
        return
      }
      const resolved = resolveCapacitorInAppLinkFromEvent(e, window.location.href, linkOptions)
      if (!resolved) {
        clearPendingTouch()
        return
      }
      const touch = e.touches[0]
      pendingTouchRef.current = {
        href: resolved.href,
        startX: touch.clientX,
        startY: touch.clientY,
        moved: false,
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      const pending = pendingTouchRef.current
      if (!pending || pending.moved || e.touches.length !== 1) return
      const touch = e.touches[0]
      if (
        exceedsCapacitorLinkTapMoveThreshold(
          pending.startX,
          pending.startY,
          touch.clientX,
          touch.clientY
        )
      ) {
        pending.moved = true
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      const pending = pendingTouchRef.current
      clearPendingTouch()
      if (!pending || pending.moved) return

      e.preventDefault()
      e.stopPropagation()
      navigateInApp(pending.href)
      touchHandledHrefRef.current = pending.href
      window.setTimeout(() => {
        touchHandledHrefRef.current = null
      }, 500)
    }

    const handleTouchCancel = () => {
      clearPendingTouch()
    }

    const handleClick = (e: MouseEvent) => {
      const resolved = resolveCapacitorInAppLinkFromEvent(e, window.location.href, linkOptions)
      // Suppress only the synthetic click that follows touchstart on the same link.
      if (resolved && touchHandledHrefRef.current === resolved.href) {
        e.preventDefault()
        e.stopPropagation()
        return
      }
      if (!resolved) return
      intercept(e)
    }

    const passiveCapture: AddEventListenerOptions = { capture: true, passive: true }
    const activeCapture: AddEventListenerOptions = { capture: true, passive: false }

    document.addEventListener('touchstart', handleTouchStart, passiveCapture)
    document.addEventListener('touchmove', handleTouchMove, passiveCapture)
    document.addEventListener('touchend', handleTouchEnd, activeCapture)
    document.addEventListener('touchcancel', handleTouchCancel, passiveCapture)
    document.addEventListener('click', handleClick, true)
    return () => {
      document.removeEventListener('touchstart', handleTouchStart, passiveCapture)
      document.removeEventListener('touchmove', handleTouchMove, passiveCapture)
      document.removeEventListener('touchend', handleTouchEnd, activeCapture)
      document.removeEventListener('touchcancel', handleTouchCancel, passiveCapture)
      document.removeEventListener('click', handleClick, true)
    }
  }, [router])

  return null
}
