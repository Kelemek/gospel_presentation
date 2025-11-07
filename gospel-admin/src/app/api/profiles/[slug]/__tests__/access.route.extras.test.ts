// Extra small permutations to cover more branches in access.route
describe('access route extras (minimal)', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('GET owner returns access list when list has items', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'owner-x' } } }) },
        from: (table: string) => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p-own', created_by: 'owner-x' } }) }) }) })
      }))
    }))

    jest.doMock('@/lib/supabase-data-service', () => ({
      getProfileAccessList: jest.fn(async () => [{ email: 'x@y.com' }])
    }))

    let GET: any
    jest.isolateModules(() => {
      GET = require('../access/route').GET
    })

    const res = await GET({} as any, { params: Promise.resolve({ slug: 'p-own' }) } as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.access).toBeInstanceOf(Array)
  })

  it('GET treats userProfile role string different casing as non-admin', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'u-case' } } }) },
        from: (table: string) => {
          if (table === 'profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'pcase', created_by: 'someone' } }) }) }) }
          return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'Admin' } }) }) }) }
        }
      }))
    }))

    let GET: any
    jest.isolateModules(() => {
      GET = require('../access/route').GET
    })

    const res = await GET({} as any, { params: Promise.resolve({ slug: 'pcase' }) } as any)
    // 'Admin' (case-sensitive) should not be treated as admin; expect 403
    expect(res.status).toBe(403)
  })

  it('POST returns 404 when profile query errors (profileError present)', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
        from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null, error: { message: 'db' } }) }) }) })
      }))
    }))

    let POST: any
    jest.isolateModules(() => {
      POST = require('../access/route').POST
    })

    const req: any = { json: async () => ({ email: 'ok@ex.com' }) }
    const res = await POST(req, { params: Promise.resolve({ slug: 'missing' }) } as any)
    expect(res.status).toBe(404)
  })

  it('POST returns 403 when userProfile is null', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'u-null' } } }) },
        from: (table: string) => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'pnull', created_by: 'owner' } }) }) }) })
      }))
    }))

    // Simulate userProfile query returning { data: null }
    jest.doMock('@/lib/supabase-data-service', () => ({
      grantProfileAccess: jest.fn(async () => true)
    }))

    // Replace supabase client user_profiles single to return null via a different mock
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'u-null' } } }) },
        from: (table: string) => {
          if (table === 'profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'pnull', created_by: 'owner' } }) }) }) }
          return { select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) }
        }
      }))
    }))

    let POST: any
    jest.isolateModules(() => {
      POST = require('../access/route').POST
    })

    const req: any = { json: async () => ({ email: 'a@b.com' }) }
    const res = await POST(req, { params: Promise.resolve({ slug: 'pnull' }) } as any)
    expect(res.status).toBe(403)
  })

  it('DELETE handles revokeProfileAccess falsey return gracefully (200 expected)', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'owner-3' } } }) },
        from: (table: string) => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'po3', created_by: 'owner-3' } }) }) }) })
      }))
    }))

    jest.doMock('@/lib/supabase-data-service', () => ({
      revokeProfileAccess: jest.fn(async () => false)
    }))

    let DELETE_ROUTE: any
    jest.isolateModules(() => {
      DELETE_ROUTE = require('../access/route').DELETE
    })

    const req: any = { json: async () => ({ email: 'z@z.com' }) }
    const res = await DELETE_ROUTE(req, { params: Promise.resolve({ slug: 'po3' }) } as any)
    // route returns 200 regardless of revoke return value
    expect(res.status).toBe(200)
  })

  it('POST handles grantProfileAccess returning falsy (still 200)', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'owner-4' } } }) },
        from: (table: string) => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'po4', created_by: 'owner-4' } }) }) }) })
      }))
    }))

    jest.doMock('@/lib/supabase-data-service', () => ({
      grantProfileAccess: jest.fn(async () => null)
    }))

    let POST: any
    jest.isolateModules(() => {
      POST = require('../access/route').POST
    })

    const req: any = { json: async () => ({ email: 'ok@ex.com' }) }
    const res = await POST(req, { params: Promise.resolve({ slug: 'po4' }) } as any)
    expect(res.status).toBe(200)
  })

})
