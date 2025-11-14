import { GET } from '../scripture/route'
import { NextRequest } from 'next/server'

// Mock Supabase admin client for cache operations
jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(() => ({
    from: jest.fn((table: string) => {
      if (table === 'scripture_cache') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: null, // cache miss - no cached data
                    error: null
                  })
                })
              })
            })
          }),
          upsert: jest.fn().mockResolvedValue({
            data: null,
            error: null
          })
        }
      }
      return {}
    })
  }))
}))

describe('/api/scripture', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    delete process.env.ESV_API_TOKEN
  })

  it('returns 400 when reference is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/scripture')
    const res = await GET(req as any)
    const data = await res.json()
    expect(res.status).toBe(400)
    expect(data.error).toMatch(/Scripture reference is required/i)
  })

  it('returns 500 when ESV API token is not configured', async () => {
    const req = new NextRequest('http://localhost:3000/api/scripture?reference=John+3:16')
    const res = await GET(req as any)
    const data = await res.json()
    expect(res.status).toBe(500)
    expect(data.error).toMatch(/ESV API token not configured/i)
  })

  it('returns scripture text when ESV responds', async () => {
    process.env.ESV_API_TOKEN = 'test-token'
    const mockPassages = ['For God so loved the world...']
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ passages: mockPassages })
    } as any)

    const req = new NextRequest('http://localhost:3000/api/scripture?reference=John+3:16')
    const res = await GET(req as any)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.reference).toBe('John 3:16')
    expect(data.text).toBe(mockPassages[0].trim())
  })
})
