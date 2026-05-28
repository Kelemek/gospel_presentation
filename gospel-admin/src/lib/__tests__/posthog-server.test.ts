jest.mock('posthog-node', () => ({
  PostHog: jest.fn().mockImplementation(() => ({
    shutdown: jest.fn().mockResolvedValue(undefined),
  })),
}))

jest.mock('@/lib/posthog-config', () => ({
  getPostHogProjectKey: jest.fn(),
  getPostHogApiHost: jest.fn(() => 'https://ph.example.com'),
}))

import { PostHog } from 'posthog-node'
import { getPostHogApiHost, getPostHogProjectKey } from '@/lib/posthog-config'
import {
  getPostHogServerClient,
  shutdownPostHogServerClient,
} from '@/lib/posthog-server'

const mockGetKey = getPostHogProjectKey as jest.MockedFunction<typeof getPostHogProjectKey>

describe('posthog-server', () => {
  afterEach(async () => {
    await shutdownPostHogServerClient()
    jest.clearAllMocks()
  })

  it('returns null when project key is missing', () => {
    mockGetKey.mockReturnValue(undefined)
    expect(getPostHogServerClient()).toBeNull()
    expect(PostHog).not.toHaveBeenCalled()
  })

  it('creates a singleton client with flush settings', () => {
    mockGetKey.mockReturnValue('phc_test')
    const first = getPostHogServerClient()
    const second = getPostHogServerClient()
    expect(first).not.toBeNull()
    expect(second).toBe(first)
    expect(PostHog).toHaveBeenCalledTimes(1)
    expect(PostHog).toHaveBeenCalledWith('phc_test', {
      host: getPostHogApiHost(),
      flushAt: 1,
      flushInterval: 0,
    })
  })

  it('shutdown clears the singleton', async () => {
    mockGetKey.mockReturnValue('phc_test')
    const client = getPostHogServerClient()
    expect(client).not.toBeNull()
    await shutdownPostHogServerClient()
    expect(client?.shutdown).toHaveBeenCalled()
    mockGetKey.mockReturnValue('phc_test')
    getPostHogServerClient()
    expect(PostHog).toHaveBeenCalledTimes(2)
  })

  it('shutdown is a no-op when client was never created', async () => {
    mockGetKey.mockReturnValue(undefined)
    await expect(shutdownPostHogServerClient()).resolves.toBeUndefined()
  })
})
