jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createAdminClient: jest.fn(),
}))
import { NextRequest } from 'next/server'
import { POST } from '../route'
import * as server from '@/lib/supabase/server'

describe('POST /api/user/translation', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 400 for invalid translation', async () => {
    const req = new NextRequest('http://localhost/api/user/translation', {
      method: 'POST',
      body: JSON.stringify({ translation: 'invalid' }),
    })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toMatch(/Invalid translation/)
  })

  it('returns 401 when not authenticated', async () => {
    ;(server.createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    })
    const req = new NextRequest('http://localhost/api/user/translation', {
      method: 'POST',
      body: JSON.stringify({ translation: 'esv' }),
    })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 200 for NIV when authenticated', async () => {
    ;(server.createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
    })
    ;(server.createAdminClient as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    })
    const req = new NextRequest('http://localhost/api/user/translation', {
      method: 'POST',
      body: JSON.stringify({ translation: 'niv' }),
    })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
  })

  it('returns 200 and updates preference when authenticated', async () => {
    ;(server.createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
    })
    ;(server.createAdminClient as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    })
    const req = new NextRequest('http://localhost/api/user/translation', {
      method: 'POST',
      body: JSON.stringify({ translation: 'lsb' }),
    })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
  })

  it('returns 500 when update fails', async () => {
    ;(server.createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
    })
    ;(server.createAdminClient as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: { message: 'DB' } }),
      }),
    })
    const req = new NextRequest('http://localhost/api/user/translation', {
      method: 'POST',
      body: JSON.stringify({ translation: 'esv' }),
    })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.error).toMatch(/Failed to update/)
  })
})
