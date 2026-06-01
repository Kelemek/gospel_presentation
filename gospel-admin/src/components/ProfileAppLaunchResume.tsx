'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { applyProfileAppLaunchResume } from '@/lib/profileAppLaunchResume'

/**
 * On cold start at `/` or `/default`, open the last profile the reader was on (no hash)
 * so ProfileContent automatic reading resume can restore scroll position.
 */
export function ProfileAppLaunchResume() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!pathname) return

    let cancelled = false
    const getPathname = () => (cancelled ? null : window.location.pathname)

    void applyProfileAppLaunchResume((path) => router.replace(path), { getPathname })

    return () => {
      cancelled = true
    }
  }, [pathname, router])

  return null
}
