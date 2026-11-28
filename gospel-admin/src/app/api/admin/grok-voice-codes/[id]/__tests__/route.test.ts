import { NextRequest } from 'next/server'
import { DELETE, PATCH } from '../route'
import { requireAdminUser } from '@/lib/adminAuth'
import { revokeGrokVoiceCode } from '@/lib/grokVoiceDb'

jest.mock('@/lib/adminAuth', () => ({
  requireAdminUser: jest.fn(),
}))

jest.mock('@/lib/grokVoiceDb', () => ({
  revokeGrokVoiceCode: jest.fn(),
}))

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}))

const auth = requireAdminUser as jest.MockedFunction<typeof requireAdminUser>
const revoke = revokeGrokVoiceCode as jest.MockedFunction<typeof revokeGrokVoiceCode>
const CODE_ID = '11111111-1111-4111-8111-111111111111'

function patch(body: unknown, id = CODE_ID) {
  return PATCH(
    new NextRequest(`http://localhost/api/admin/grok-voice-codes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) }
  )
}

describe('revoke a Grok voice code', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    auth.mockResolvedValue({ ok: true, userId: 'admin-1', email: 'admin@example.com' })
    revoke.mockResolvedValue('revoked')
  })

  it('returns 403 before revoking when the caller is not an admin', async () => {
    auth.mockResolvedValue({ ok: false, status: 403, error: 'Forbidden - Admin access required' })
    const response = await patch({ revoked: true })
    expect(response.status).toBe(403)
    expect(revoke).not.toHaveBeenCalled()
    const removed = await DELETE(new NextRequest('http://localhost/api/admin/grok-voice-codes/' + CODE_ID), {
      params: Promise.resolve({ id: CODE_ID }),
    })
    expect(removed.status).toBe(403)
    expect(revoke).not.toHaveBeenCalled()
  })

  it('revokes from PATCH and DELETE', async () => {
    const patched = await patch({ revoked: true })
    expect(patched.status).toBe(200)
    await expect(patched.json()).resolves.toEqual({ revoked: true })
    const removed = await DELETE(new NextRequest('http://localhost/api/admin/grok-voice-codes/' + CODE_ID), {
      params: Promise.resolve({ id: CODE_ID }),
    })
    expect(removed.status).toBe(200)
    expect(revoke).toHaveBeenCalledTimes(2)
    expect(revoke).toHaveBeenCalledWith(CODE_ID)
  })

  it('returns 404 when the code does not exist', async () => {
    revoke.mockResolvedValue('missing')
    const response = await patch({ revoked: true })
    expect(response.status).toBe(404)
  })
})
