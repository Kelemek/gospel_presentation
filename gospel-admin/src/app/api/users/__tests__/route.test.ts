jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createAdminClient: jest.fn(),
}))
import { GET } from '../route'
import * as server from '@/lib/supabase/server'

describe('GET /api/users', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    ;(server.createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    })
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 403 when user is not admin', async () => {
    ;(server.createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { role: 'counselee' }, error: null }),
      }),
    })
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(403)
    expect(body.error).toBe('Forbidden')
  })

  it('returns 200 with merged users when admin', async () => {
    ;(server.createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
      }),
    })
    ;(server.createAdminClient as jest.Mock).mockReturnValue({
      auth: { admin: { listUsers: jest.fn().mockResolvedValue({ data: { users: [{ id: 'u1', email: 'a@b.com' }] }, error: null }) } },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ data: [{ id: 'u1', role: 'admin', username: 'admin' }], error: null }),
      }),
    })
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.users).toHaveLength(1)
    expect(body.users[0]).toMatchObject({ email: 'a@b.com', role: 'admin', username: 'admin' })
  })

  it('returns null role when user_profiles row is missing for an auth user', async () => {
    ;(server.createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
      }),
    })
    ;(server.createAdminClient as jest.Mock).mockReturnValue({
      auth: { admin: { listUsers: jest.fn().mockResolvedValue({
        data: { users: [
          { id: 'u1', email: 'a@b.com' },
          { id: 'orphan', email: 'orphan@example.com' },
        ] },
        error: null,
      }) } },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [{ id: 'u1', role: 'admin', username: 'admin' }],
          error: null,
        }),
      }),
    })
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.users).toHaveLength(2)
    const orphan = body.users.find((u: { email: string }) => u.email === 'orphan@example.com')
    expect(orphan).toMatchObject({ email: 'orphan@example.com', role: null })
  })

  it('returns 500 when listUsers fails', async () => {
    ;(server.createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
      }),
    })
    ;(server.createAdminClient as jest.Mock).mockReturnValue({
      auth: { admin: { listUsers: jest.fn().mockResolvedValue({ data: null, error: { message: 'Auth fail' } }) } },
    })
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.error).toMatch(/Failed to fetch users/)
  })
})
