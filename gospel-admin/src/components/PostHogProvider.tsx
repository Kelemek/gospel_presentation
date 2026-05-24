'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'
import { initPostHogClient } from '@/lib/posthog-config'

/**
 * Fallback client init if instrumentation-client.ts did not run (e.g. misconfigured build).
 * Primary init runs in [instrumentation-client.ts](../../instrumentation-client.ts) before hydration.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHogClient(posthog)
  }, [])

  return children
}
