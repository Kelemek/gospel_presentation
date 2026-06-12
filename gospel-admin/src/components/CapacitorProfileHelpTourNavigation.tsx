'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'
import { setProfileHelpTourClientNavigate } from '@/lib/profileHelpTours'
/**
 * Registers Next.js client navigation for profile-help tour flows on native.
 * Avoids `window.location.assign`, which can leave the WebView and open Safari/Chrome.
 *
 * Also tags the body with platform classes (`capacitor-native`, `capacitor-android`, `capacitor-ios`)
 * so CSS can target native-only spacing (e.g. keeping driver.js tour popovers clear of the Android
 * system nav bar regardless of whether `env(safe-area-inset-bottom)` is reported).
 */
export function CapacitorProfileHelpTourNavigation() {
  const router = useRouter()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const navigate = (path: string) => {
      router.push(path)
    }
    setProfileHelpTourClientNavigate(navigate)
    return () => setProfileHelpTourClientNavigate(null)
  }, [router])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const body = document.body
    if (!body) return
    const added: string[] = []
    if (Capacitor.isNativePlatform()) {
      for (const cls of ['capacitor-native', `capacitor-${Capacitor.getPlatform()}`]) {
        if (!body.classList.contains(cls)) {
          body.classList.add(cls)
          added.push(cls)
        }
      }
    }
    return () => {
      for (const cls of added) body.classList.remove(cls)
    }
  }, [])

  return null
}
