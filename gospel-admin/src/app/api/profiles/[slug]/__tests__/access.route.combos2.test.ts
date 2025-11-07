// Combination tests to exercise more boolean branches in access.route
describe('access route combinations (extra)', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('GET succeeds when both admin and owner are true', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'u-both' } } }) },
        from: (table: string) => {
          if (table === 'profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'pb', created_by: 'u-both' } }) }) }) }
          return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'admin' } }) }) }) }
        }
      }))
    }))

    jest.doMock('@/lib/supabase-data-service', () => ({
      getProfileAccessList: jest.fn(async () => [])
    }))

    let GET: any
    jest.isolateModules(() => {
      GET = require('../access/route').GET
    })

    const res = await GET({} as any, { params: Promise.resolve({ slug: 'pb' }) } as any)
    expect(res.status).toBe(200)
  })

  it('GET succeeds when admin true and owner false', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'u-admin' } } }) },
        from: (table: string) => {
          if (table === 'profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'pa', created_by: 'other' } }) }) }) }
          return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'admin' } }) }) }) }
        }
      }))
    }))

    jest.doMock('@/lib/supabase-data-service', () => ({
      getProfileAccessList: jest.fn(async () => [{ email: 'a@b.com' }])
    }))

    let GET: any
    jest.isolateModules(() => {
      GET = require('../access/route').GET
    })

    const res = await GET({} as any, { params: Promise.resolve({ slug: 'pa' }) } as any)
    expect(res.status).toBe(200)
  })

  it('POST returns 500 when grantProfileAccess throws', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'owner-x' } } }) },
        from: (table: string) => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'pp', created_by: 'owner-x' } }) }) }) })
      }))
    }))

    jest.doMock('@/lib/supabase-data-service', () => ({
      grantProfileAccess: jest.fn(async () => { throw new Error('boom grant') })
    }))

    let POST: any
    jest.isolateModules(() => {
      POST = require('../access/route').POST
    })

    const req: any = { json: async () => ({ email: 'ok@ex.com' }) }
    const res = await POST(req, { params: Promise.resolve({ slug: 'pp' }) } as any)
    expect(res.status).toBe(500)
  })

  it('DELETE returns 500 when revokeProfileAccess throws', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'owner-y' } } }) },
        from: (table: string) => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'pd', created_by: 'owner-y' } }) }) }) })
      }))
    }))

    jest.doMock('@/lib/supabase-data-service', () => ({
      revokeProfileAccess: jest.fn(async () => { throw new Error('boom revoke') })
    }))

    let DELETE_ROUTE: any
    jest.isolateModules(() => {
      DELETE_ROUTE = require('../access/route').DELETE
    })

    const req: any = { json: async () => ({ email: 'ok@ex.com' }) }
    const res = await DELETE_ROUTE(req, { params: Promise.resolve({ slug: 'pd' }) } as any)
    expect(res.status).toBe(500)
  })

  it('POST returns 400 on invalid email format', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
        from: (table: string) => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p1', created_by: 'u1' } }) }) }) })
      }))
    }))

    let POST: any
    jest.isolateModules(() => {
      POST = require('../access/route').POST
    })

    const req: any = { json: async () => ({ email: 'not-an-email' }) }
    const res = await POST(req, { params: Promise.resolve({ slug: 'p1' }) } as any)
    expect(res.status).toBe(400)
  })

  it('DELETE returns 400 when email is not string', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'u2' } } }) },
        from: (table: string) => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p2', created_by: 'u2' } }) }) }) })
      }))
    }))

    let DELETE_ROUTE: any
    jest.isolateModules(() => {
      DELETE_ROUTE = require('../access/route').DELETE
    })

    const req: any = { json: async () => ({ email: 123 }) }
    const res = await DELETE_ROUTE(req, { params: Promise.resolve({ slug: 'p2' }) } as any)
    expect(res.status).toBe(400)
  })

})
