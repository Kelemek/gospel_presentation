import { jest } from '@jest/globals'

describe('profiles/[slug] GET admin vs public', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  it('returns full profile for admin request', async () => {
    const fakeProfile = { slug: 's1', title: 'Secret', privateField: 'x' }
    jest.doMock('@/lib/supabase-data-service', () => ({
      getProfileBySlug: () => fakeProfile
    }))

    const mod = await import('../route')
    const { GET } = mod

    const req: any = { headers: { get: () => 'true' } }
    const res = await GET(req as any, { params: Promise.resolve({ slug: 's1' }) } as any)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.profile).toEqual(fakeProfile)
  })

  it('returns sanitized profile for public request', async () => {
    const fakeProfile = { slug: 's1', title: 'Public', privateField: 'secret' }
    jest.doMock('@/lib/supabase-data-service', () => ({
      getProfileBySlug: () => fakeProfile
    }))

    // mock sanitize to return only title
    jest.doMock('@/lib/profile-service', () => ({
      sanitizeProfileForPublic: (p: any) => ({ title: p.title })
    }))

    const mod = await import('../route')
    const { GET } = mod

    const req: any = { headers: { get: () => 'false' } }
    const res = await GET(req as any, { params: Promise.resolve({ slug: 's1' }) } as any)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.profile).toEqual({ title: 'Public' })
  })

  it('returns 404 when profile not found', async () => {
    jest.doMock('@/lib/supabase-data-service', () => ({
      getProfileBySlug: () => null
    }))

    const mod = await import('../route')
    const { GET } = mod

    const req: any = { headers: { get: () => 'false' } }
    const res = await GET(req as any, { params: Promise.resolve({ slug: 'missing' }) } as any)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toMatch(/not found/i)
  })

  it('returns 500 when getProfileBySlug throws', async () => {
    jest.doMock('@/lib/supabase-data-service', () => ({
      getProfileBySlug: () => { throw new Error('boom') }
    }))

    const mod = await import('../route')
    const { GET } = mod

    const req: any = { headers: { get: () => 'false' } }
    const res = await GET(req as any, { params: Promise.resolve({ slug: 's1' }) } as any)

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/failed to fetch profile/i)
  })
})
