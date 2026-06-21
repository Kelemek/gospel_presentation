import { NextRequest } from 'next/server'
import { PUT } from '@/app/api/sync/keys/route'
import { SYNC_STORAGE_ID_HEADER } from '@/lib/gospelDeviceSync/constants'
import { createDeviceSyncAdminClient } from '@/lib/gospelDeviceSync/deviceSyncSupabase'

jest.mock('@/lib/gospelDeviceSync/deviceSyncSupabase', () => ({
  createDeviceSyncAdminClient: jest.fn(),
}))

const mockCreateDeviceSyncAdminClient = createDeviceSyncAdminClient as jest.MockedFunction<
  typeof createDeviceSyncAdminClient
>

function makePutAdminMock(options: {
  remoteKeys: Array<{ storage_key: string }>
  tombstoneError?: { message: string } | null
}) {
  let upsertCall = 0

  return {
    from: jest.fn(() => ({
      select: jest.fn((columns: string) => {
        if (columns === 'storage_key') {
          return {
            eq: jest.fn().mockResolvedValue({
              data: options.remoteKeys,
              error: null,
            }),
          }
        }
        return {
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        }
      }),
      upsert: jest.fn(async () => {
        upsertCall += 1
        if (upsertCall > 1 && options.tombstoneError) {
          return { error: options.tombstoneError }
        }
        return { error: null }
      }),
    })),
  }
}

describe('PUT /api/sync/keys', () => {
  const storageId = 'a'.repeat(64)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 500 when replace-all tombstone upsert fails', async () => {
    mockCreateDeviceSyncAdminClient.mockReturnValue(
      makePutAdminMock({
        remoteKeys: [{ storage_key: 'gospel-profile-text-size' }],
        tombstoneError: { message: 'upsert failed' },
      }) as ReturnType<typeof createDeviceSyncAdminClient>
    )

    const req = new NextRequest('http://localhost/api/sync/keys', {
      method: 'PUT',
      body: JSON.stringify({
        entries: [
          {
            key: 'gospel-profile-theme',
            ciphertext: '{"iv":"x","ct":"y"}',
            updatedAt: '2026-01-01T00:00:00.000Z',
            contentHash: 'abc',
          },
        ],
      }),
    })
    req.headers.set(SYNC_STORAGE_ID_HEADER, storageId)
    req.headers.set('Content-Type', 'application/json')

    const res = await PUT(req)
    const body = (await res.json()) as { error?: string; success?: boolean }

    expect(res.status).toBe(500)
    expect(body.error).toBe('Could not save sync data')
    expect(body.success).toBeUndefined()
  })

  it('returns success when replace-all tombstones persist', async () => {
    mockCreateDeviceSyncAdminClient.mockReturnValue(
      makePutAdminMock({
        remoteKeys: [{ storage_key: 'gospel-profile-text-size' }],
        tombstoneError: null,
      }) as ReturnType<typeof createDeviceSyncAdminClient>
    )

    const req = new NextRequest('http://localhost/api/sync/keys', {
      method: 'PUT',
      body: JSON.stringify({
        entries: [
          {
            key: 'gospel-profile-theme',
            ciphertext: '{"iv":"x","ct":"y"}',
            updatedAt: '2026-01-01T00:00:00.000Z',
            contentHash: 'abc',
          },
        ],
      }),
    })
    req.headers.set(SYNC_STORAGE_ID_HEADER, storageId)
    req.headers.set('Content-Type', 'application/json')

    const res = await PUT(req)
    const body = (await res.json()) as { success?: boolean }

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
  })
})
