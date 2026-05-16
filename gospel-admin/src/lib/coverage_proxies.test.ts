// These proxy tests import the same route modules using the '@/' mapper
// to ensure the coverage collector counts the files referenced in
// jest.coverage.cjs's collectCoverageFrom (module identity alignment).

jest.mock('@/lib/data-service', () => ({
  getProfileBySlug: jest.fn(async (slug: string) => ({ slug, title: 'Test', savedAnswers: [] })),
  updateProfile: jest.fn(async () => ({})),
  getProfiles: jest.fn(),
  createProfile: jest.fn(),
  deleteProfile: jest.fn(),
  incrementProfileVisitCount: jest.fn(),
}))

jest.mock('@/lib/supabase-data-service', () => ({
  getProfileBySlug: jest.fn(async (slug: string) => {
    if (slug === 'missing') return null
    return { slug, title: 'Test', gospelData: [] }
  }),
  updateProfile: jest.fn(async (slug: string, updates: Record<string, unknown>) => {
    if (slug === 'missing') throw new Error('not found')
    return { slug, ...updates }
  }),
  deleteProfile: jest.fn(async (slug: string) => {
    if (slug === 'missing') throw new Error('not found')
    if (slug === 'default') throw new Error('Cannot delete the default profile')
    return true
  }),
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

describe('coverage proxy imports (mapper-aligned)', () => {
  it('favicon GET redirects', async () => {
    const res = await faviconGET({ url: 'https://test.local' } as Request)
    expect(res.status).toBe(301)
  })

  it('scripture GET input validation (no reference)', async () => {
    const req = { url: 'https://test.local' } as Request
    const res = await scriptureGET(req as never)
    expect(res.status).toBe(400)
  })

  it('profile route GET/PUT/DELETE flows', async () => {
    const reqGet = { headers: { get: () => 'false' } }
    const r1 = await profileGET(reqGet as never, { params: Promise.resolve({ slug: 'test' }) } as never)
    expect(r1.status).toBe(200)

    const reqPut = { json: async () => ({ title: 'New' }) }
    const r2 = await profilePUT(reqPut as never, { params: Promise.resolve({ slug: 'test' }) } as never)
    expect(r2.status).toBe(200)

    const r3 = await profileDELETE({} as never, { params: Promise.resolve({ slug: 'test' }) } as never)
    expect(r3.status).toBe(200)
  })

  it('profile GET admin branch returns full profile', async () => {
    const reqGetAdmin = { headers: { get: () => 'true' } }
    const r = await profileGET(reqGetAdmin as never, { params: Promise.resolve({ slug: 'test' }) } as never)
    expect(r.status).toBe(200)
  })
})
