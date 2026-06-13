'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import {
  attemptCapacitorRecoveryReload,
  hasGospelAppSurface,
  isCapacitorNativeApp,
} from '@/lib/capacitorAppRecovery'

const BLANK_PAGE_CHECK_DELAY_MS = 8_000

/**
 * On Capacitor native, reload once if the route never paints meaningful UI
 * (empty WebView after splash). Matches `data-gospel-surface` or static pages with `<main>`.
 */
export function CapacitorBlankPageGuard() {
  const pathname = usePathname()

  useEffect(() => {
    if (!isCapacitorNativeApp()) return

    const timerId = window.setTimeout(() => {
      if (hasGospelAppSurface()) return
      attemptCapacitorRecoveryReload('blank-page-watchdog')
    }, BLANK_PAGE_CHECK_DELAY_MS)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [pathname])

  return null
}
