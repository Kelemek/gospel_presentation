jest.mock('@/lib/profile-service', () => ({
  sanitizeProfileForPublic: (p: any) => ({ sanitized: true, ...p })
}))

jest.mock('@/lib/supabase-data-service', () => ({
  getProfileBySlug: jest.fn(async (slug: string) => {
    if (slug === 'missing') return null
    return { slug, title: 'Test', gospelData: [] }
  }),
  updateProfile: jest.fn(async (slug: string, updates: any) => {
    if (slug === 'missing') throw new Error('not found')
    return { slug, ...updates }
  }),
  deleteProfile: jest.fn(async (slug: string) => {
    if (slug === 'missing') throw new Error('not found')
    if (slug === 'default') throw new Error('Cannot delete the default profile')
    return true
  })
}))

import { GET, PUT, DELETE } from '../[slug]/route'

describe('profiles route', () => {
  it('GET returns 404 for missing profile', async () => {
    const req: any = { headers: new Map() }
    const res = await GET(req, { params: Promise.resolve({ slug: 'missing' }) } as any)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toContain("'missing'")
  })

  it('GET returns sanitized profile for public requests', async () => {
    const headers = new Map()
    const req: any = { headers: { get: (k: string) => 'false' } }
    const res = await GET(req, { params: Promise.resolve({ slug: 'test' }) } as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.profile).toHaveProperty('sanitized', true)
  })

  it('PUT updates profile and returns updated object', async () => {
    const req: any = { json: async () => ({ title: 'New' }) }
    const res = await PUT(req, { params: Promise.resolve({ slug: 'test' }) } as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.title).toBe('New')
  })

  it('PUT returns 404 when updateProfile throws not found', async () => {
    const req: any = { json: async () => ({ title: 'New' }) }
    const res = await PUT(req, { params: Promise.resolve({ slug: 'missing' }) } as any)
    expect(res.status).toBe(404)
  })

  it('DELETE returns 200 on success and handles not found and default errors', async () => {
    const req: any = {}
    const ok = await DELETE(req, { params: Promise.resolve({ slug: 'test' }) } as any)
    expect(ok.status).toBe(200)

    const notFound = await DELETE(req, { params: Promise.resolve({ slug: 'missing' }) } as any)
    expect(notFound.status).toBe(404)

    const forbidden = await DELETE(req, { params: Promise.resolve({ slug: 'default' }) } as any)
    expect(forbidden.status).toBe(403)
  })
})
