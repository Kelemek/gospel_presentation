jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'user1' } } }) },
    from: jest.fn(() => ({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn(async () => ({ data: { id: 'p1', created_by: 'user1' } }) ) }))
  }))
}))

jest.mock('@/lib/supabase-data-service', () => ({
  getProfileAccessList: jest.fn(async (id: string) => [{ email: 'a@b.com' }]),
  grantProfileAccess: jest.fn(async () => true),
  revokeProfileAccess: jest.fn(async () => true),
}))

import { GET, POST, DELETE } from '../access/route'

describe('profiles access route', () => {
  it('GET returns access list for authorized user', async () => {
    const req: any = {}
    const res = await GET(req, { params: Promise.resolve({ slug: 'test' }) } as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.access).toBeInstanceOf(Array)
  })

  it('POST validates email and grants access', async () => {
    const req: any = { json: async () => ({ email: 'NEW@EXAMPLE.COM' }) }
    const res = await POST(req, { params: Promise.resolve({ slug: 'test' }) } as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.email).toBe('new@example.com')
  })

  it('DELETE validates email and revokes access', async () => {
    const req: any = { json: async () => ({ email: 'a@b.com' }) }
    const res = await DELETE(req, { params: Promise.resolve({ slug: 'test' }) } as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.email).toBe('a@b.com')
  })
})
