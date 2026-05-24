'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import posthog from 'posthog-js'
import { getPostHogProjectKey } from '@/lib/posthog-config'

/**
 * Captures $pageview on App Router navigations (after PostHog client init).
 */
export function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // useSearchParams() may return a new object reference each render; depend on the string.
  const searchParamsString = searchParams?.toString() ?? ''

  useEffect(() => {
    if (!getPostHogProjectKey()) return
    if (!posthog.__loaded) return

    const url =
      window.location.origin +
      pathname +
      (searchParamsString ? `?${searchParamsString}` : '')

    posthog.capture('$pageview', { $current_url: url })
  }, [pathname, searchParamsString])

  return null
}
