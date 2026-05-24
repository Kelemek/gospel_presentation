import { PostHog } from 'posthog-node'
import { getPostHogApiHost, getPostHogProjectKey } from '@/lib/posthog-config'

let serverClient: PostHog | null = null

/** Server-side PostHog client for API routes (flush immediately; call shutdown when done). */
export function getPostHogServerClient(): PostHog | null {
  const key = getPostHogProjectKey()
  if (!key) return null
  if (!serverClient) {
    serverClient = new PostHog(key, {
      host: getPostHogApiHost(),
      flushAt: 1,
      flushInterval: 0,
    })
  }
  return serverClient
}

export async function shutdownPostHogServerClient(): Promise<void> {
  if (serverClient) {
    await serverClient.shutdown()
    serverClient = null
  }
}
