import { GET } from '../route'

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
    }),
    rpc: jest.fn().mockResolvedValue({ data: 0, error: null })
  }))
}))

describe('scripture API route', () => {
  beforeEach(() => {
    jest.resetModules()
    delete process.env.ESV_API_TOKEN
  })

  it('returns 400 when reference missing', async () => {
    const req: any = { url: 'https://example.com/api/scripture' }
    const res = await GET(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Scripture reference is required')
  })

  it('returns 500 when token missing', async () => {
    const req: any = { url: 'https://example.com/api/scripture?reference=John+3:16' }
    const res = await GET(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('ESV API token not configured')
  })

  it('fetches scripture when token present', async () => {
    process.env.ESV_API_TOKEN = 'token'

    // mock global fetch
    // @ts-ignore
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ passages: ['In the beginning...'] }),
    }))

    const req: any = { url: 'https://example.com/api/scripture?reference=John+3:16' }
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.reference).toBe('John 3:16')
    expect(body.text).toContain('In the beginning')
  })
})
