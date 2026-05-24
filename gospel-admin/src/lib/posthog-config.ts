import type { PostHog, PostHogConfig } from 'posthog-js'

/**
 * Shared PostHog client init (instrumentation-client.ts + PostHogProvider fallback).
 * Next.js 16 loads `instrumentation-client.ts` at the app root before hydration (not `instrumentation.ts`, which is server-only).
 * Free tier: ~5k session recordings/month — keep client sampling conservative.
 */

export const POSTHOG_SESSION_RECORDING_SAMPLE_RATE = 0.15

export function getPostHogProjectKey(): string | undefined {
  return process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() || undefined
}

export function getPostHogApiHost(): string {
  return (
    process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() ||
    'https://us.i.posthog.com'
  )
}

export function getPostHogClientInitOptions(): Pick<
  PostHogConfig,
  'api_host' | 'capture_exceptions' | 'session_recording' | 'loaded'
> {
  const sampleRate = POSTHOG_SESSION_RECORDING_SAMPLE_RATE
  return {
    api_host: getPostHogApiHost(),
    capture_exceptions: true,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '*',
    },
    loaded(posthog) {
      if (Math.random() > sampleRate) {
        posthog.stopSessionRecording()
      }
    },
  }
}

/** Idempotent client init; safe to call from instrumentation-client and PostHogProvider. */
export function initPostHogClient(posthog: Pick<PostHog, '__loaded' | 'init'>): boolean {
  const key = getPostHogProjectKey()
  if (!key || posthog.__loaded) return false
  posthog.init(key, getPostHogClientInitOptions())
  return true
}
