import { POST } from '../users/create/route'
import { NextRequest } from 'next/server'

// Mock supabase server helpers
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createAdminClient: jest.fn(),
}))

import * as supaServer from '@/lib/supabase/server'

describe('/api/users/create', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    (supaServer.createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) }
    })

    const req = new NextRequest('http://localhost:3000/api/users/create', { method: 'POST', body: '{}' })
    const res = await POST(req as any)
    const data = await res.json()
    expect(res.status).toBe(401)
    expect(data.error).toMatch(/Not authenticated/i)
  })

  it('returns 403 when user is not admin', async () => {
    (supaServer.createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { role: 'counselee' } }) })
    })

    const req = new NextRequest('http://localhost:3000/api/users/create', { method: 'POST', body: '{}' })
    const res = await POST(req as any)
    const data = await res.json()
    expect(res.status).toBe(403)
    expect(data.error).toMatch(/Only admins can create users/i)
  })

  it('returns 400 when email missing', async () => {
    (supaServer.createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { role: 'admin' } }) })
    })

    const req = new NextRequest('http://localhost:3000/api/users/create', { method: 'POST', body: JSON.stringify({ role: 'admin' }) })
    const res = await POST(req as any)
    const data = await res.json()
    expect(res.status).toBe(400)
    expect(data.error).toMatch(/Email is required/i)
  })

  it('returns 400 when role invalid', async () => {
    (supaServer.createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { role: 'admin' } }) })
    })

    const req = new NextRequest('http://localhost:3000/api/users/create', { method: 'POST', body: JSON.stringify({ email: 'test@example.com', role: 'invalid' }) })
    const res = await POST(req as any)
    const data = await res.json()
    expect(res.status).toBe(400)
    expect(data.error).toMatch(/Invalid role/i)
  })

  it('creates a user successfully', async () => {
    (supaServer.createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { role: 'admin' } }) })
    })

    const adminMock = {
      auth: { admin: { createUser: jest.fn().mockResolvedValue({ data: { user: { id: 'new-id', email: 'x@y.z' } }, error: null }), inviteUserByEmail: jest.fn().mockResolvedValue({ error: null }) } },
      from: jest.fn().mockReturnValue({ upsert: jest.fn().mockResolvedValue({ error: null }) })
    }

    ;(supaServer.createAdminClient as jest.Mock).mockReturnValue(adminMock)

    const body = { email: 'new@example.com', role: 'counselor' }
    const req = new NextRequest('http://localhost:3000/api/users/create', { method: 'POST', body: JSON.stringify(body) })
    const res = await POST(req as any)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.user).toBeDefined()
  })
})
