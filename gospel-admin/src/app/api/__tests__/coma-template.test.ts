import { GET, PUT } from '@/app/api/coma-template/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))
import * as supaServer from '@/lib/supabase/server'

describe('/api/coma-template', () => {
  beforeEach(() => jest.clearAllMocks())

  it('GET returns template wrapped in { template }', async () => {
    ;(supaServer.createClient as jest.Mock).mockResolvedValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 't1', name: 'default', questions: [], instructions: '<p>ok</p>', is_default: true }, error: null })
      }),
    })

    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toHaveProperty('template')
    expect(body.template).toHaveProperty('instructions')
    expect(body.template.instructions).toContain('<p>ok</p>')
  })

  it('GET returns 500 when DB error', async () => {
    ;(supaServer.createClient as jest.Mock).mockResolvedValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB' } })
      }),
    })

    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.error).toMatch(/Failed to fetch COMA template/i)
  })

  it('PUT returns 401 when unauthenticated', async () => {
    ;(supaServer.createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) }
    })

    const req = new NextRequest('http://localhost:3000/api/coma-template', { method: 'PUT', body: JSON.stringify({ questions: [] }) })
    const res = await PUT(req as any)
    const body = await res.json()
    expect(res.status).toBe(401)
    expect(body.error).toMatch(/Unauthorized/i)
  })

  it('PUT returns 403 when user not admin', async () => {
    ;(supaServer.createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { role: 'counselee' } }) })
    })

    const req = new NextRequest('http://localhost:3000/api/coma-template', { method: 'PUT', body: JSON.stringify({ questions: [] }) })
    const res = await PUT(req as any)
    const body = await res.json()
    expect(res.status).toBe(403)
    expect(body.error).toMatch(/Forbidden - Admin access required/i)
  })

  it('PUT returns 400 when questions not array', async () => {
    ;(supaServer.createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'admin' } } }) },
      from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { role: 'admin' } }) })
    })

    const req = new NextRequest('http://localhost:3000/api/coma-template', { method: 'PUT', body: JSON.stringify({ questions: 'nope' }) })
    const res = await PUT(req as any)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toMatch(/Questions must be an array/i)
  })

  it('PUT updates template successfully when admin', async () => {
    ;(supaServer.createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'admin' } } }) },
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { role: 'admin' } }) }
        }
        if (table === 'coma_templates') {
          return {
            // update().eq().select().single()
            update: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { id: 't1', questions: ['q1'], instructions: '<p>new</p>' }, error: null }) })
          }
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null }) }
      })
    })

    const bodyObj = { questions: ['q1'], instructions: '<p>new</p>' }
    const req = new NextRequest('http://localhost:3000/api/coma-template', { method: 'PUT', body: JSON.stringify(bodyObj) })
    const res = await PUT(req as any)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toHaveProperty('template')
    expect(body.template.instructions).toContain('<p>new</p>')
  })
})
