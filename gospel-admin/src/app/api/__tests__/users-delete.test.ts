import { DELETE } from '../users/[id]/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createAdminClient: jest.fn(),
}))
import * as supaServer from '@/lib/supabase/server'

describe('/api/users/[id] DELETE', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    (supaServer.createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) }
    })

    const req = new NextRequest('http://localhost:3000/api/users/abc', { method: 'DELETE' })
    const res = await DELETE(req as any, { params: Promise.resolve({ id: 'abc' }) } as any)
    const data = await res.json()
    expect(res.status).toBe(401)
    expect(data.error).toMatch(/Not authenticated/i)
  })

  it('prevents deleting own account', async () => {
    (supaServer.createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'self' } } }) }
    })

    const res = await DELETE(new NextRequest('http://localhost:3000/api/users/self', { method: 'DELETE' }) as any, { params: Promise.resolve({ id: 'self' }) } as any)
    const data = await res.json()
    expect(res.status).toBe(400)
    expect(data.error).toMatch(/Cannot delete your own account/i)
  })

  it('returns 403 when not admin', async () => {
    (supaServer.createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { role: 'counselee' } }) })
    })

    const res = await DELETE(new NextRequest('http://localhost:3000/api/users/other', { method: 'DELETE' }) as any, { params: Promise.resolve({ id: 'other' }) } as any)
    const data = await res.json()
    expect(res.status).toBe(403)
    expect(data.error).toMatch(/Only admins can delete users/i)
  })

  it('deletes user successfully', async () => {
    (supaServer.createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'admin' } } }) },
      from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { role: 'admin' } }) })
    })

    const adminMock = {
      auth: {
        admin: {
          getUserById: jest.fn().mockResolvedValue({ data: { user: { email: 'u@e.com' } } }),
          deleteUser: jest.fn().mockResolvedValue({ error: null }),
          inviteUserByEmail: jest.fn(),
        },
      },
      // Implement `from` with jest.fn() so chained calls return promises
      from: jest.fn().mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      }),
    }

  ;(supaServer.createAdminClient as jest.Mock).mockImplementation(() => adminMock)

    const res = await DELETE(new NextRequest('http://localhost:3000/api/users/target', { method: 'DELETE' }) as any, { params: Promise.resolve({ id: 'target' }) } as any)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
  })
})
