// Batch 4: more branch permutations to raise coverage
describe('access route batch4 (more branches)', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('GET allows admin (admin true, owner false)', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'u-admin2' } } }) },
        from: (table: string) => {
          if (table === 'profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p-ad', created_by: 'other' } }) }) }) }
          return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'admin' } }) }) }) }
        }
      }))
    }))

    jest.doMock('@/lib/supabase-data-service', () => ({ getProfileAccessList: jest.fn(async () => []) }))

    let GET: any
    jest.isolateModules(() => {
      GET = require('../access/route').GET
    })

    const res = await GET({} as any, { params: Promise.resolve({ slug: 'p-ad' }) } as any)
    expect(res.status).toBe(200)
  })

  it('POST allows admin to grant access when grantProfileAccess undefined', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'u-admin3' } } }) },
        from: (table: string) => {
          if (table === 'profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p-ag', created_by: 'other' } }) }) }) }
          return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'admin' } }) }) }) }
        }
      }))
    }))

    jest.doMock('@/lib/supabase-data-service', () => ({ grantProfileAccess: jest.fn(async () => undefined) }))

    let POST: any
    jest.isolateModules(() => {
      POST = require('../access/route').POST
    })

    const req: any = { json: async () => ({ email: '  TeSt@EX.COM  ' }) }
    const res = await POST(req, { params: Promise.resolve({ slug: 'p-ag' }) } as any)
    expect(res.status).toBe(200)
  })

  it('DELETE allows admin to revoke access when revokeProfileAccess undefined', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'u-admin4' } } }) },
        from: (table: string) => {
          if (table === 'profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p-rv', created_by: 'other' } }) }) }) }
          return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'admin' } }) }) }) }
        }
      }))
    }))

    jest.doMock('@/lib/supabase-data-service', () => ({ revokeProfileAccess: jest.fn(async () => undefined) }))

    let DELETE_ROUTE: any
    jest.isolateModules(() => {
      DELETE_ROUTE = require('../access/route').DELETE
    })

    const req: any = { json: async () => ({ email: 'UPPER@EX.COM' }) }
    const res = await DELETE_ROUTE(req, { params: Promise.resolve({ slug: 'p-rv' }) } as any)
    expect(res.status).toBe(200)
  })

  it('GET owner true allows even when userProfile empty object', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'owner-empty' } } }) },
        from: (table: string) => {
          if (table === 'profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p-own2', created_by: 'owner-empty' } }) }) }) }
          return { select: () => ({ eq: () => ({ single: async () => ({ data: {} }) }) }) }
        }
      }))
    }))

    jest.doMock('@/lib/supabase-data-service', () => ({ getProfileAccessList: jest.fn(async () => []) }))

    let GET: any
    jest.isolateModules(() => {
      GET = require('../access/route').GET
    })

    const res = await GET({} as any, { params: Promise.resolve({ slug: 'p-own2' }) } as any)
    expect(res.status).toBe(200)
  })

  it('POST rejects role casing different than admin (e.g., ADMIN) as forbidden', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'u-case2' } } }) },
        from: (table: string) => {
          if (table === 'profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p-case2', created_by: 'other' } }) }) }) }
          return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'ADMIN' } }) }) }) }
        }
      }))
    }))

    let POST: any
    jest.isolateModules(() => {
      POST = require('../access/route').POST
    })

    const req: any = { json: async () => ({ email: 'a@b.com' }) }
    const res = await POST(req, { params: Promise.resolve({ slug: 'p-case2' }) } as any)
    expect(res.status).toBe(403)
  })

})
