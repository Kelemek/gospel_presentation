import { jest } from '@jest/globals'

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

describe('scripture route branches', () => {
  beforeEach(() => {
    jest.resetModules()
    delete process.env.ESV_API_TOKEN
  })

  it('returns 400 when reference missing', async () => {
    const mod = await import('../route')
    const { GET } = mod

    const res = await GET({ url: 'http://localhost' } as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/reference is required/i)
  })

  it('returns 500 when ESV token missing', async () => {
    const mod = await import('../route')
    const { GET } = mod

    const res = await GET({ url: 'http://localhost?reference=John 3:16' } as any)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/esv api token not configured/i)
  })

  it('returns 500 with details when fetch returns non-ok', async () => {
    process.env.ESV_API_TOKEN = 'token'
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: false, status: 502 } as any)

    const mod = await import('../route')
    const { GET } = mod

    const res = await GET({ url: 'http://localhost?reference=John 3:16' } as any)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.details).toMatch(/ESV API error: 502/i)
  })

  it('returns 500 with Unknown error when fetch throws non-Error', async () => {
    process.env.ESV_API_TOKEN = 'token'
    jest.spyOn(global, 'fetch').mockImplementationOnce(() => { throw 'boom' })

    const mod = await import('../route')
    const { GET } = mod

    const res = await GET({ url: 'http://localhost?reference=John 3:16' } as any)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.details).toBe('Unknown error')
  })
})
