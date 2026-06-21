import { NextRequest } from 'next/server'
import { POST } from '@/app/api/sync/pairing/claim/route'
import { createDeviceSyncAdminClient } from '@/lib/gospelDeviceSync/deviceSyncSupabase'

jest.mock('@/lib/gospelDeviceSync/deviceSyncSupabase', () => ({
  createDeviceSyncAdminClient: jest.fn(),
}))

jest.mock('@/lib/gospelDeviceSync/serverRateLimit', () => ({
  checkPairingClaimRateLimit: jest.fn().mockResolvedValue(true),
  getClientIp: jest.fn().mockReturnValue('127.0.0.1'),
}))

const mockCreateDeviceSyncAdminClient = createDeviceSyncAdminClient as jest.MockedFunction<
  typeof createDeviceSyncAdminClient
>

function makeClaimAdminMock(session: Record<string, unknown> | null) {
  return {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn().mockResolvedValue({ data: session, error: null }),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({ error: null }),
      })),
    })),
  }
}

describe('POST /api/sync/pairing/claim', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('accepts a still-valid PostgREST expires_at timestamp', async () => {
    const nowMs = Date.parse('2026-06-20T22:27:28.900Z')
    jest.spyOn(Date, 'now').mockReturnValue(nowMs)

    mockCreateDeviceSyncAdminClient.mockReturnValue(
      makeClaimAdminMock({
        id: 'session-1',
        storage_id: 'a'.repeat(64),
        encrypted_sync_key: 'envelope',
        expires_at: '2026-06-20T22:27:29.00100+00:00',
        claimed_at: null,
      }) as ReturnType<typeof createDeviceSyncAdminClient>
    )

    const request = new NextRequest('http://localhost/api/sync/pairing/claim', {
      method: 'POST',
      body: JSON.stringify({ code: '123456' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
  })

  it('rejects an expired session using epoch comparison', async () => {
    const nowMs = Date.parse('2026-06-20T22:27:30.000Z')
    jest.spyOn(Date, 'now').mockReturnValue(nowMs)

    mockCreateDeviceSyncAdminClient.mockReturnValue(
      makeClaimAdminMock({
        id: 'session-1',
        storage_id: 'a'.repeat(64),
        encrypted_sync_key: 'envelope',
        expires_at: '2026-06-20T22:27:29.99900+00:00',
        claimed_at: null,
      }) as ReturnType<typeof createDeviceSyncAdminClient>
    )

    const request = new NextRequest('http://localhost/api/sync/pairing/claim', {
      method: 'POST',
      body: JSON.stringify({ code: '123456' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(404)
  })
})
