'use client'

import { useEffect } from 'react'
import { SplashScreen } from '@capacitor/splash-screen'

const SPLASH_HIDE_DELAY_MS = 400
const SPLASH_HIDE_FALLBACK_MS = 2500

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

    const timeoutId = setTimeout(hideSplash, SPLASH_HIDE_DELAY_MS)
    const fallbackId = setTimeout(hideSplash, SPLASH_HIDE_FALLBACK_MS)
    if (document.readyState === 'complete') {
      hideSplash()
    } else {
      window.addEventListener('load', onLoad)
    }

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
      clearTimeout(fallbackId)
      window.removeEventListener('load', onLoad)
    }
  }, [])

  return null
}
