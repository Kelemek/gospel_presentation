// These proxy tests import the same route modules using the '@/' mapper
// to ensure the coverage collector counts the files referenced in
// jest.coverage.cjs's collectCoverageFrom (module identity alignment).

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
  }),
  getProfileAccessList: jest.fn(async () => [{ user_email: 'a@b.com' }]),
  grantProfileAccess: jest.fn(async () => true),
  revokeProfileAccess: jest.fn(async () => true),
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'user1' } } }) },
    from: jest.fn(() => ({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn(async () => ({ data: { id: 'p1', created_by: 'user1' } }) ) }))
  })),
}))

import { GET as faviconGET } from '@/app/favicon.ico/route'
import { GET as scriptureGET } from '@/app/api/scripture/route'
import { GET as profileGET, PUT as profilePUT, DELETE as profileDELETE } from '@/app/api/profiles/[slug]/route'
import { GET as accessGET, POST as accessPOST, DELETE as accessDELETE } from '@/app/api/profiles/[slug]/access/route'

describe('coverage proxy imports (mapper-aligned)', () => {
  it('favicon GET redirects', async () => {
    const res = await faviconGET({ url: 'https://test.local' } as any)
    expect(res.status).toBe(301)
  })

  it('scripture GET input validation (no reference)', async () => {
    const req: any = { url: 'https://test.local' }
    const res = await scriptureGET(req as any)
    expect(res.status).toBe(400)
  })

  it('profile route GET/PUT/DELETE flows', async () => {
    const reqGet: any = { headers: { get: (k: string) => 'false' } }
    const r1 = await profileGET(reqGet, { params: Promise.resolve({ slug: 'test' }) } as any)
    expect(r1.status).toBe(200)

    const reqPut: any = { json: async () => ({ title: 'New' }) }
    const r2 = await profilePUT(reqPut, { params: Promise.resolve({ slug: 'test' }) } as any)
    expect(r2.status).toBe(200)

    const r3 = await profileDELETE({} as any, { params: Promise.resolve({ slug: 'test' }) } as any)
    expect(r3.status).toBe(200)
  })

  it('profile GET admin branch returns full profile', async () => {
    const reqGetAdmin: any = { headers: { get: (k: string) => 'true' } }
    const r = await profileGET(reqGetAdmin, { params: Promise.resolve({ slug: 'test' }) } as any)
    expect(r.status).toBe(200)
  })

  it('access route GET/POST/DELETE flows', async () => {
    const g = await accessGET({} as any, { params: Promise.resolve({ slug: 'test' }) } as any)
    expect(g.status).toBe(200)

    const pReq: any = { json: async () => ({ email: 'NEW@EXAMPLE.COM' }) }
    const p = await accessPOST(pReq, { params: Promise.resolve({ slug: 'test' }) } as any)
    expect(p.status).toBe(200)

    const dReq: any = { json: async () => ({ email: 'a@b.com' }) }
    const d = await accessDELETE(dReq, { params: Promise.resolve({ slug: 'test' }) } as any)
    expect(d.status).toBe(200)
  })
})
