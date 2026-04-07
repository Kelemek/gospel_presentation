'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'
import { setProfileHelpTourClientNavigate } from '@/lib/profileHelpTours'

/**
 * Registers Next.js client navigation for profile-help tour flows on native.
 * Avoids `window.location.assign`, which can leave the WebView and open Safari/Chrome.
 */
export function CapacitorProfileHelpTourNavigation() {
  const router = useRouter()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    setProfileHelpTourClientNavigate((path) => {
      router.push(path)
    })
    return () => setProfileHelpTourClientNavigate(null)
  }, [router])

  return null
}
