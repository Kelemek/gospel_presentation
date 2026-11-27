import { NextRequest } from 'next/server'
import { PATCH } from '../route'
import { requireAdminUser } from '@/lib/adminAuth'
import { createAdminClient } from '@/lib/supabase/server'

jest.mock('@/lib/adminAuth', () => ({
  requireAdminUser: jest.fn(),
}))

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}))

const mockRequireAdminUser = requireAdminUser as jest.MockedFunction<typeof requireAdminUser>
const USER_ID = '11111111-1111-4111-8111-111111111111'

function adminClient(result: { data: unknown; error: unknown }) {
  const maybeSingle = jest.fn().mockResolvedValue(result)
  const select = jest.fn(() => ({ maybeSingle }))
  const eq = jest.fn(() => ({ select }))
  const update = jest.fn(() => ({ eq }))
  return {
    from: jest.fn(() => ({ update })),
    update,
    eq,
  }
}

function patch(body: unknown, id = USER_ID) {
  return PATCH(
    new NextRequest(`http://localhost/api/admin/users/${id}/grok-voice`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) }
  )
}

describe('PATCH /api/admin/users/[id]/grok-voice', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAdminUser.mockResolvedValue({ ok: true, userId: 'admin-1', email: 'admin@example.com' })
  })

  it('rejects a caller who is not an admin', async () => {
    mockRequireAdminUser.mockResolvedValue({ ok: false, status: 403, error: 'Forbidden - Admin access required' })
    const response = await patch({ enabled: true })
    expect(response.status).toBe(403)
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('rejects a body that is not { enabled: boolean }', async () => {
    const response = await patch({ enabled: 'yes' })
    expect(response.status).toBe(400)
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('updates grok_voice_enabled and returns the stored flag', async () => {
    const client = adminClient({ data: { id: USER_ID, grok_voice_enabled: true }, error: null })
    jest.mocked(createAdminClient).mockReturnValue(client as never)
    const response = await patch({ enabled: true })
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ enabled: true })
    expect(client.update).toHaveBeenCalledWith({ grok_voice_enabled: true })
    expect(client.eq).toHaveBeenCalledWith('id', USER_ID)
  })

  it('returns 404 when the user row is missing', async () => {
    jest.mocked(createAdminClient).mockReturnValue(adminClient({ data: null, error: null }) as never)
    const response = await patch({ enabled: false })
    expect(response.status).toBe(404)
  })
})
