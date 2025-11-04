import { NextRequest } from 'next/server'

// Mock the server-side supabase admin client
const mockListUsers = jest.fn()
const mockAdminClient = {
  auth: {
    admin: {
      listUsers: mockListUsers
    }
  }
}

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => mockAdminClient
}))

import { POST } from '../route'

describe('/api/auth/check-user', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('returns 400 when email is missing', async () => {
    const req = new NextRequest('http://localhost/api/auth/check-user', { method: 'POST', body: '{}' })
    const res = await POST(req as any)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBeDefined()
  })

  it('returns exists=true when email is present in listUsers', async () => {
    mockListUsers.mockResolvedValue({ data: { users: [{ id: 'u1', email: 'found@x.com' }] }, error: null })

    const req = new NextRequest('http://localhost/api/auth/check-user', { method: 'POST', body: JSON.stringify({ email: 'found@x.com' }) })
    const res = await POST(req as any)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.exists).toBe(true)
  })

  it('handles admin client error and returns 500', async () => {
    mockListUsers.mockResolvedValue({ data: { users: [] }, error: new Error('fail') })

    const req = new NextRequest('http://localhost/api/auth/check-user', { method: 'POST', body: JSON.stringify({ email: 'nope@x.com' }) })
    const res = await POST(req as any)
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBeDefined()
  })
})
