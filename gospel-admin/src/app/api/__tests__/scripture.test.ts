import { GET } from '../scripture/route'
import { NextRequest } from 'next/server'

// Mock Supabase admin client for cache operations
const mockSupabaseClient = {
  from: jest.fn((table: string) => {
    if (table === 'scripture_cache') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: null, // cache miss by default
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
}

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(() => mockSupabaseClient)
}))

jest.mock('@/lib/verse-counter', () => ({
  getTotalEsvCacheVerseCount: jest.fn().mockResolvedValue(250),
  getTotalCacheVerseCountForTranslation: jest.fn().mockResolvedValue(120),
}))

jest.mock('@/lib/bible-api', () => ({
  fetchScripture: jest.fn(async (reference: string, translation: string) => {
    if (translation === 'esv') {
      return {
        reference: 'John 3:16',
        text: 'For God so loved the world...',
        translation: 'esv'
      }
    } else if (translation === 'niv' || translation === 'nlt' || translation === 'csb') {
      return {
        reference: reference || 'John 3:16',
        text: '[16] For God so loved the world...',
        translation
      }
    } else if (translation === 'kjv') {
      return {
        reference: 'Genesis 1:1',
        text: 'In the beginning was the Word...',
        translation: 'kjv'
      }
    } else if (translation === 'nasb') {
      return {
        reference: 'Genesis 1:1',
        text: 'In the beginning was the Word...',
        translation: 'nasb'
      }
    } else if (translation === 'lsb') {
      return {
        reference: 'Genesis 1:1',
        text: 'In the beginning God created the heavens and the earth.',
        translation: 'lsb'
      }
    }
    throw new Error('Scripture text not found')
  })
}))

jest.mock('@/lib/scripture-logging', () => ({
  getSessionId: jest.fn(() => 'test-session-id'),
  logScriptureAccess: jest.fn().mockResolvedValue(undefined)
}))

describe('/api/scripture', () => {
  beforeEach(() => {
    delete process.env.ESV_API_TOKEN
    jest.clearAllMocks()
    // Reset mock to cache miss by default
    mockSupabaseClient.from = jest.fn((table: string) => {
      if (table === 'scripture_cache') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: null,
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
    mockSupabaseClient.rpc = jest.fn().mockResolvedValue({ data: 0, error: null })
  })

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

  it('returns 400 when reference is only whitespace', async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/scripture?reference=${encodeURIComponent('   ')}`
    )
    const res = await GET(req as any)
    const data = await res.json()
    expect(res.status).toBe(400)
    expect(data.error).toMatch(/Scripture reference is required/i)
  })

  it('returns 400 for invalid translation', async () => {
    const req = new NextRequest('http://localhost:3000/api/scripture?reference=John+3:16&translation=invalid')
    const res = await GET(req as any)
    const data = await res.json()
    expect(res.status).toBe(400)
    expect(data.error).toMatch(/Invalid translation/i)
  })

  it('returns 500 when ESV API token is not configured', async () => {
    const { fetchScripture } = require('@/lib/bible-api')
    fetchScripture.mockRejectedValueOnce(new Error('ESV API token not configured'))

    const req = new NextRequest('http://localhost:3000/api/scripture?reference=John+3:16')
    const res = await GET(req as any)
    const data = await res.json()
    expect(res.status).toBe(500)
    expect(data.error).toMatch(/ESV API token not configured/i)
  })

  it('returns scripture text when ESV responds', async () => {
    process.env.ESV_API_TOKEN = 'test-token'

    const req = new NextRequest('http://localhost:3000/api/scripture?reference=John+3:16')
    const res = await GET(req as any)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.reference).toBe('John 3:16')
    expect(data.translation).toBe('esv')
    expect(data.cached).toBe(false)
  })

  it('returns scripture when NIV responds on cache miss and enforces cache limit', async () => {
    process.env.ESV_API_TOKEN = 'test-token'

    const req = new NextRequest('http://localhost:3000/api/scripture?reference=John+3:16&translation=niv')
    const res = await GET(req as any)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.translation).toBe('niv')
    expect(data.cached).toBe(false)
    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
      'enforce_translation_cache_limit',
      expect.objectContaining({
        p_translation: 'niv',
        p_current_total_verses: 120,
        p_max_verses: 500,
      })
    )
  })

  it('returns 500 when API.Bible is not configured for NIV', async () => {
    process.env.ESV_API_TOKEN = 'test-token'
    const { fetchScripture } = require('@/lib/bible-api')
    fetchScripture.mockRejectedValueOnce(new Error('API.Bible key not configured'))

    const req = new NextRequest('http://localhost:3000/api/scripture?reference=John+3:16&translation=niv')
    const res = await GET(req as any)
    const data = await res.json()
    expect(res.status).toBe(500)
    expect(data.error).toMatch(/API\.Bible key not configured/i)
  })



  it('returns cached ESV scripture on cache hit', async () => {
    process.env.ESV_API_TOKEN = 'test-token'
    
    // Setup cache hit
    mockSupabaseClient.from = jest.fn((table: string) => {
      if (table === 'scripture_cache') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: { text: 'For God so loved the world...' },
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

    const req = new NextRequest('http://localhost:3000/api/scripture?reference=John+3:16')
    const res = await GET(req as any)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.reference).toBe('John 3:16')
    expect(data.cached).toBe(true)
    expect(data.text).toBe('For God so loved the world...')
  })

  it('returns trimmed reference on cache hit (same shape as cache miss)', async () => {
    process.env.ESV_API_TOKEN = 'test-token'

    mockSupabaseClient.from = jest.fn((table: string) => {
      if (table === 'scripture_cache') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: { text: 'cached' },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
          upsert: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }
      }
      return {}
    })

    const padded = '  John 3:16  '
    const req = new NextRequest(
      `http://localhost:3000/api/scripture?reference=${encodeURIComponent(padded)}`
    )
    const res = await GET(req as any)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.reference).toBe('John 3:16')
    expect(data.cached).toBe(true)
  })

  it('calls fetchScripture with trimmed reference on cache miss', async () => {
    process.env.ESV_API_TOKEN = 'test-token'
    const { fetchScripture } = require('@/lib/bible-api')

    const padded = '  John 3:16  '
    const req = new NextRequest(
      `http://localhost:3000/api/scripture?reference=${encodeURIComponent(padded)}`
    )
    const res = await GET(req as any)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.reference).toBe('John 3:16')
    expect(fetchScripture).toHaveBeenCalledWith('John 3:16', 'esv')
  })

  it('caches KJV response and enforces translation cache limit', async () => {
    process.env.ESV_API_TOKEN = 'test-token'

    const req = new NextRequest('http://localhost:3000/api/scripture?reference=Genesis+1:1&translation=kjv')
    const res = await GET(req as any)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.translation).toBe('kjv')
    expect(data.cached).toBe(false)
    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
      'enforce_translation_cache_limit',
      expect.objectContaining({
        p_translation: 'kjv',
        p_current_total_verses: 120,
        p_max_verses: 500,
      })
    )
  })

  it('caches NASB response and enforces translation cache limit', async () => {
    process.env.ESV_API_TOKEN = 'test-token'

    const req = new NextRequest('http://localhost:3000/api/scripture?reference=Genesis+1:1&translation=nasb')
    const res = await GET(req as any)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.translation).toBe('nasb')
    expect(data.cached).toBe(false)
    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
      'enforce_translation_cache_limit',
      expect.objectContaining({
        p_translation: 'nasb',
        p_current_total_verses: 120,
        p_max_verses: 500,
      })
    )
  })

  it('caches LSB response and enforces translation cache limit', async () => {
    process.env.ESV_API_TOKEN = 'test-token'

    const req = new NextRequest('http://localhost:3000/api/scripture?reference=Genesis+1:1&translation=lsb')
    const res = await GET(req as any)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.translation).toBe('lsb')
    expect(data.cached).toBe(false)
    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
      'enforce_translation_cache_limit',
      expect.objectContaining({
        p_translation: 'lsb',
        p_current_total_verses: 120,
        p_max_verses: 500,
      })
    )
  })

  it('returns 404 for scripture not found', async () => {
    process.env.ESV_API_TOKEN = 'test-token'
    const { fetchScripture } = require('@/lib/bible-api')
    fetchScripture.mockRejectedValueOnce(new Error('Scripture text not found'))

    const req = new NextRequest('http://localhost:3000/api/scripture?reference=Invalid+1:1')
    const res = await GET(req as any)
    const data = await res.json()
    expect(res.status).toBe(404)
    expect(data.error).toMatch(/Scripture text not found/i)
  })

  it('returns 500 on database error', async () => {
    process.env.ESV_API_TOKEN = 'test-token'
    const { fetchScripture } = require('@/lib/bible-api')
    fetchScripture.mockRejectedValueOnce(new Error('Database error: connection failed'))

    const req = new NextRequest('http://localhost:3000/api/scripture?reference=John+3:16')
    const res = await GET(req as any)
    const data = await res.json()
    expect(res.status).toBe(500)
    expect(data.error).toMatch(/Database error occurred/i)
  })

  it('handles non-Error thrown values gracefully', async () => {
    process.env.ESV_API_TOKEN = 'test-token'
    const { fetchScripture } = require('@/lib/bible-api')
    fetchScripture.mockRejectedValueOnce('boom')

    const req = new NextRequest('http://localhost:3000/api/scripture?reference=John+3:16')
    const res = await GET(req as any)
    const data = await res.json()
    expect(res.status).toBe(500)
    expect(data.error).toMatch(/Failed to fetch scripture/i)
    expect(data.details).toBe('Unknown error')
  })

  it('handles cache upsert failures gracefully', async () => {
    process.env.ESV_API_TOKEN = 'test-token'
    
    // Mock upsert failure
    mockSupabaseClient.from = jest.fn((table: string) => {
      if (table === 'scripture_cache') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: null,
                    error: null
                  })
                })
              })
            })
          }),
          upsert: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Insert failed' }
          })
        }
      }
      return {}
    })
    
    const req = new NextRequest('http://localhost:3000/api/scripture?reference=John+3:16')
    const res = await GET(req as any)
    const data = await res.json()
    // Request should still succeed even if caching fails
    expect(res.status).toBe(200)
    expect(data.text).toBeDefined()
    expect(data.cached).toBe(false)
  })

  it('enforces cache limit on successful cache insert', async () => {
    process.env.ESV_API_TOKEN = 'test-token'
    
    // Mock successful cache with RPC eviction call
    mockSupabaseClient.from = jest.fn((table: string) => {
      if (table === 'scripture_cache') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: null,
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
    
    mockSupabaseClient.rpc = jest.fn().mockResolvedValue({ data: 10, error: null })
    
    const req = new NextRequest('http://localhost:3000/api/scripture?reference=John+3:16')
    const res = await GET(req as any)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.text).toBeDefined()
    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
      'enforce_esv_cache_limit',
      expect.objectContaining({
        p_current_total_verses: 250,
        p_max_verses: 500
      })
    )
  })

  it('handles RPC limit enforcement errors gracefully', async () => {
    process.env.ESV_API_TOKEN = 'test-token'
    
    // Mock successful upsert but RPC error
    mockSupabaseClient.from = jest.fn((table: string) => {
      if (table === 'scripture_cache') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: null,
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
    
    mockSupabaseClient.rpc = jest.fn().mockResolvedValue({ 
      data: null, 
      error: { message: 'RPC failed' } 
    })
    
    const req = new NextRequest('http://localhost:3000/api/scripture?reference=John+3:16')
    const res = await GET(req as any)
    const data = await res.json()
    // Request should succeed even if RPC fails
    expect(res.status).toBe(200)
    expect(data.text).toBeDefined()
  })

  it('catches and handles unexpected runtime errors', async () => {
    process.env.ESV_API_TOKEN = 'test-token'
    const { fetchScripture } = require('@/lib/bible-api')
    
    // Throw a generic Error that doesn't match any specific pattern
    fetchScripture.mockRejectedValueOnce(new Error('Unexpected error occurred'))

    const req = new NextRequest('http://localhost:3000/api/scripture?reference=John+3:16')
    const res = await GET(req as any)
    const data = await res.json()
    expect(res.status).toBe(500)
    expect(data.error).toBe('Failed to fetch scripture text')
    expect(data.details).toMatch(/Unexpected error/)
  })

  it('uses fallback message when error has no message', async () => {
    process.env.ESV_API_TOKEN = 'test-token'
    const { fetchScripture } = require('@/lib/bible-api')
    
    // Throw an Error with empty message to test the fallback
    const errorWithNoMsg = new Error('')
    fetchScripture.mockRejectedValueOnce(errorWithNoMsg)

    const req = new NextRequest('http://localhost:3000/api/scripture?reference=John+3:16')
    const res = await GET(req as any)
    const data = await res.json()
    expect(res.status).toBe(500)
    expect(data.error).toBe('Failed to fetch scripture text')
  })
})
