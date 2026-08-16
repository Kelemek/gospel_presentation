'use client'

import { useEffect } from 'react'

export function useProfileVisitTracking(
  profileSlug: string | undefined,
  allowVisitTracking: boolean
) {
  useEffect(() => {
    const trackVisit = async () => {
      try {
        await fetch(`/api/profiles/${profileSlug}/visit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      } catch (error) {
        console.warn('Visit tracking failed:', error)
      }
    }

    if (!allowVisitTracking) return
    if (profileSlug && profileSlug !== 'admin') {
      void trackVisit()
    }
  }, [profileSlug, allowVisitTracking])
}
