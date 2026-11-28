import { NextRequest } from 'next/server'
import { PATCH } from '../route'
import { requireAdminUser } from '@/lib/adminAuth'
import { revokeGrokVoiceDevice } from '@/lib/grokVoiceDb'

jest.mock('@/lib/adminAuth', () => ({
  requireAdminUser: jest.fn(),
}))

jest.mock('@/lib/grokVoiceDb', () => ({
  revokeGrokVoiceDevice: jest.fn(),
}))

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}))

const auth = requireAdminUser as jest.MockedFunction<typeof requireAdminUser>
const revoke = revokeGrokVoiceDevice as jest.MockedFunction<typeof revokeGrokVoiceDevice>
const DEVICE_ID = '22222222-2222-4222-8222-222222222222'

describe('PATCH /api/admin/grok-voice-devices/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    auth.mockResolvedValue({ ok: true, userId: 'admin-1', email: 'admin@example.com' })
    revoke.mockResolvedValue('revoked')
  })

  it('returns 403 for a caller who is not an admin', async () => {
    auth.mockResolvedValue({ ok: false, status: 403, error: 'Forbidden - Admin access required' })
    const response = await PATCH(
      new NextRequest('http://localhost/api/admin/grok-voice-devices/' + DEVICE_ID, {
        method: 'PATCH',
        body: JSON.stringify({ revoked: true }),
      }),
      { params: Promise.resolve({ id: DEVICE_ID }) }
    )
    expect(response.status).toBe(403)
    expect(revoke).not.toHaveBeenCalled()
  })

  it('revokes the device', async () => {
    const response = await PATCH(
      new NextRequest('http://localhost/api/admin/grok-voice-devices/' + DEVICE_ID, {
        method: 'PATCH',
        body: JSON.stringify({ revoked: true }),
      }),
      { params: Promise.resolve({ id: DEVICE_ID }) }
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ revoked: true })
    expect(revoke).toHaveBeenCalledWith(DEVICE_ID)
  })
})
