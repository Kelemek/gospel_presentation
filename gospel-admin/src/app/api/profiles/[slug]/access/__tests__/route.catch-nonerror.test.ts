import { jest } from '@jest/globals'

describe('access route catch branch for non-Error throw', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  it('returns 500 and generic message when a non-Error is thrown', async () => {
    // Mock createClient to throw a non-Error (string)
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: async () => { throw 'nope' }
    }))

    const mod = await import('../route')
    const { GET } = mod

    const res = await GET({} as any, { params: Promise.resolve({ slug: 's1' }) } as any)

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Failed to fetch profile access')
  })
})
