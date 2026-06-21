import { NextRequest } from 'next/server'
import { GET } from '@/app/api/sync/pairing/status/route'
import { createDeviceSyncAdminClient } from '@/lib/gospelDeviceSync/deviceSyncSupabase'

jest.mock('@/lib/gospelDeviceSync/deviceSyncSupabase', () => ({
  createDeviceSyncAdminClient: jest.fn(),
}))

const mockCreateDeviceSyncAdminClient = createDeviceSyncAdminClient as jest.MockedFunction<
  typeof createDeviceSyncAdminClient
>

function makeStatusAdminMock(session: Record<string, unknown> | null) {
  return {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn().mockResolvedValue({ data: session, error: null }),
        })),
      })),
    })),
  }
}

describe('GET /api/sync/pairing/status', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns pending true for an active session', async () => {
    const nowMs = Date.parse('2026-06-20T22:27:28.900Z')
    jest.spyOn(Date, 'now').mockReturnValue(nowMs)

    mockCreateDeviceSyncAdminClient.mockReturnValue(
      makeStatusAdminMock({ expires_at: '2026-06-20T22:29:28.900Z' }) as ReturnType<
        typeof createDeviceSyncAdminClient
      >
    )

    const request = new NextRequest('http://localhost/api/sync/pairing/status?code=123456')
    const response = await GET(request)
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ pending: true })
  })

  it('returns pending false when the session is gone', async () => {
    mockCreateDeviceSyncAdminClient.mockReturnValue(
      makeStatusAdminMock(null) as ReturnType<typeof createDeviceSyncAdminClient>
    )

    const request = new NextRequest('http://localhost/api/sync/pairing/status?code=123456')
    const response = await GET(request)
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ pending: false })
  })

  it('returns pending false when the session is expired', async () => {
    const nowMs = Date.parse('2026-06-20T22:30:00.000Z')
    jest.spyOn(Date, 'now').mockReturnValue(nowMs)

    mockCreateDeviceSyncAdminClient.mockReturnValue(
      makeStatusAdminMock({ expires_at: '2026-06-20T22:29:00.000Z' }) as ReturnType<
        typeof createDeviceSyncAdminClient
      >
    )

    const request = new NextRequest('http://localhost/api/sync/pairing/status?code=123456')
    const response = await GET(request)
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ pending: false })
  })
})
