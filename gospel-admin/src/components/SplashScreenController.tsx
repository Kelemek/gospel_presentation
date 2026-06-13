'use client'

import { useEffect } from 'react'
import { SplashScreen } from '@capacitor/splash-screen'
import { hasGospelAppSurface, isCapacitorNativeApp } from '@/lib/capacitorAppRecovery'

const SPLASH_HIDE_POLL_MS = 100
const SPLASH_HIDE_DELAY_MS = 400
const SPLASH_HIDE_MAX_WAIT_MS = 5_000
const SPLASH_HIDE_FALLBACK_MS = 2_500

/**
 * When running in the Capacitor native app, keeps the native splash screen
 * visible until the web app is ready, then hides it. Requires
 * plugins.SplashScreen.launchAutoHide: false in capacitor.config.
 * We always attempt hide() (no isNativePlatform check) so the splash goes away
 * even when loading from a remote URL, where platform can be reported as web.
 */
export function SplashScreenController() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    let cancelled = false

    const hideSplash = () => {
      if (cancelled) return
      SplashScreen.hide().catch(() => {
        // No-op in browser or if plugin fails; fallback will retry
      })
    }

    const onLoad = () => {
      hideSplash()
    }

    if (isCapacitorNativeApp()) {
      const startedAt = Date.now()
      const pollId = window.setInterval(() => {
        if (cancelled) return
        if (hasGospelAppSurface() || Date.now() - startedAt >= SPLASH_HIDE_MAX_WAIT_MS) {
          window.clearInterval(pollId)
          hideSplash()
        }
      }, SPLASH_HIDE_POLL_MS)

      return () => {
        cancelled = true
        window.clearInterval(pollId)
      }
    }

    const timeoutId = window.setTimeout(hideSplash, SPLASH_HIDE_DELAY_MS)
    const fallbackId = window.setTimeout(hideSplash, SPLASH_HIDE_FALLBACK_MS)
    if (document.readyState === 'complete') {
      hideSplash()
    } else {
      window.addEventListener('load', onLoad)
    }

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
      window.clearTimeout(fallbackId)
      window.removeEventListener('load', onLoad)
    }
  }, [])

  return null
}
