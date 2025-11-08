import { jest } from '@jest/globals'

describe('profiles/[slug] cover remaining branches', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  it('uses default targetSlug when slug is default', async () => {
    let calledWith: any = null
    jest.doMock('@/lib/supabase-data-service', () => ({
      getProfileBySlug: (s: string) => {
        calledWith = s
        return { slug: s, title: 'Default' }
      }
    }))

    const mod = await import('../route')
    const { GET } = mod

    const req: any = { headers: { get: () => 'false' } }
    const res = await GET(req as any, { params: Promise.resolve({ slug: 'default' }) } as any)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.profile.slug).toBe('default')
    expect(calledWith).toBe('default')
  })

  it('PUT includes description and gospelData in updates when provided', async () => {
    jest.doMock('@/lib/supabase-data-service', () => ({
      updateProfile: (slug: string, updates: any) => ({ slug, ...updates })
    }))

    const mod = await import('../route')
    const { PUT } = mod

    const payload = { title: 'T', description: 'desc', gospelData: { foo: 'bar' } }
    const req: any = { json: async () => payload }
    const res = await PUT(req as any, { params: Promise.resolve({ slug: 's1' }) } as any)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.description).toBe('desc')
    expect(body.gospelData).toEqual({ foo: 'bar' })
  })
})
