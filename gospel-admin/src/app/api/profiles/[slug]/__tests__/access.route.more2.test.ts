// Additional focused tests for access.route to exercise more branches
describe('access route additional branches', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('POST returns 400 when email missing', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) } }))
    }))

    let POST: any
    jest.isolateModules(() => {
      POST = require('../access/route').POST
    })

    const req: any = { json: async () => ({}) }
    const res = await POST(req, { params: Promise.resolve({ slug: 'p1' }) } as any)
    expect(res.status).toBe(400)
  })

  it('POST returns 400 on invalid email format', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u2' } } }) } }))
    }))

    let POST: any
    jest.isolateModules(() => {
      POST = require('../access/route').POST
    })

    const req: any = { json: async () => ({ email: 'not-an-email' }) }
    const res = await POST(req, { params: Promise.resolve({ slug: 'p2' }) } as any)
    expect(res.status).toBe(400)
  })

  it('DELETE returns 400 when email missing', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u3' } } }) } }))
    }))

    let DELETE_ROUTE: any
    jest.isolateModules(() => {
      DELETE_ROUTE = require('../access/route').DELETE
    })

    const req: any = { json: async () => ({}) }
    const res = await DELETE_ROUTE(req, { params: Promise.resolve({ slug: 'p3' }) } as any)
    expect(res.status).toBe(400)
  })

  it('POST succeeds when user is owner and grantProfileAccess called', async () => {
    // mock createClient with user and profile (owner)
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'owner-1' } } }) },
        from: (table: string) => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'prof-1', created_by: 'owner-1' } }) }) }) })
      }))
    }))

    const mockGrant = jest.fn(async () => {})
    jest.doMock('@/lib/supabase-data-service', () => ({ grantProfileAccess: mockGrant }))

    let POST: any
    jest.isolateModules(() => {
      POST = require('../access/route').POST
    })

    const req: any = { json: async () => ({ email: 'ok@me.com' }) }
    const res = await POST(req, { params: Promise.resolve({ slug: 'prof-1' }) } as any)
    expect(res.status).toBe(200)
    expect(mockGrant).toHaveBeenCalled()
  })

  it('GET returns 200 with access list when admin', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'admin-1' } } }) },
        from: (table: string) => {
          if (table === 'profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p-admin', created_by: 'someone' } }) }) }) }
          return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'admin' } }) }) }) }
        }
      }))
    }))

    const mockList = jest.fn(async () => [{ email: 'x@x.com' }])
    jest.doMock('@/lib/supabase-data-service', () => ({ getProfileAccessList: mockList }))

    let GET: any
    jest.isolateModules(() => {
      GET = require('../access/route').GET
    })

    const res = await GET({} as any, { params: Promise.resolve({ slug: 'p-admin' }) } as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.access).toBeDefined()
    expect(mockList).toHaveBeenCalled()
  })

  it('DELETE succeeds when user is owner and revokeProfileAccess called', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'owner-del' } } }) },
        from: (table: string) => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'prof-del', created_by: 'owner-del' } }) }) }) })
      }))
    }))

    const mockRevoke = jest.fn(async () => {})
    jest.doMock('@/lib/supabase-data-service', () => ({ revokeProfileAccess: mockRevoke }))

    let DELETE_ROUTE: any
    jest.isolateModules(() => {
      DELETE_ROUTE = require('../access/route').DELETE
    })

    const req: any = { json: async () => ({ email: 'bye@you.com' }) }
    const res = await DELETE_ROUTE(req, { params: Promise.resolve({ slug: 'prof-del' }) } as any)
    expect(res.status).toBe(200)
    expect(mockRevoke).toHaveBeenCalled()
  })

  it('DELETE returns 500 when revokeProfileAccess throws', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'owner-del-2' } } }) },
        from: (table: string) => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'prof-del-2', created_by: 'owner-del-2' } }) }) }) })
      }))
    }))

    const mockRevoke = jest.fn(async () => { throw new Error('boom revoke') })
    jest.doMock('@/lib/supabase-data-service', () => ({ revokeProfileAccess: mockRevoke }))

    let DELETE_ROUTE: any
    jest.isolateModules(() => {
      DELETE_ROUTE = require('../access/route').DELETE
    })

    const req: any = { json: async () => ({ email: 'err@me.com' }) }
    const res = await DELETE_ROUTE(req, { params: Promise.resolve({ slug: 'prof-del-2' }) } as any)
    expect(res.status).toBe(500)
  })

  it('POST succeeds when userProfile role is admin and grantProfileAccess called', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'admin-post' } } }) },
        from: (table: string) => {
          if (table === 'profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p-admin-post', created_by: 'someone' } }) }) }) }
          return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'admin' } }) }) }) }
        }
      }))
    }))

    const mockGrant = jest.fn(async () => {})
    jest.doMock('@/lib/supabase-data-service', () => ({ grantProfileAccess: mockGrant }))

    let POST: any
    jest.isolateModules(() => {
      POST = require('../access/route').POST
    })

    const req: any = { json: async () => ({ email: 'admin@ex.com' }) }
    const res = await POST(req, { params: Promise.resolve({ slug: 'p-admin-post' }) } as any)
    expect(res.status).toBe(200)
    expect(mockGrant).toHaveBeenCalled()
  })

  it('GET returns 200 when userProfile role is admin (explicit role)', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'admin-get' } } }) },
        from: (table: string) => {
          if (table === 'profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p-admin-get', created_by: 'owner-x' } }) }) }) }
          return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'admin' } }) }) }) }
        }
      }))
    }))

    const mockList = jest.fn(async () => [{ email: 'a@b.com' }])
    jest.doMock('@/lib/supabase-data-service', () => ({ getProfileAccessList: mockList }))

    let GET: any
    jest.isolateModules(() => {
      GET = require('../access/route').GET
    })

    const res = await GET({} as any, { params: Promise.resolve({ slug: 'p-admin-get' }) } as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.access).toBeDefined()
    expect(mockList).toHaveBeenCalled()
  })

  it('DELETE returns 500 when revokeProfileAccess throws a non-Error value', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'owner-del-3' } } }) },
        from: (table: string) => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'prof-del-3', created_by: 'owner-del-3' } }) }) }) })
      }))
    }))

    const mockRevoke = jest.fn(async () => { throw {} })
    jest.doMock('@/lib/supabase-data-service', () => ({ revokeProfileAccess: mockRevoke }))

    let DELETE_ROUTE: any
    jest.isolateModules(() => {
      DELETE_ROUTE = require('../access/route').DELETE
    })

    const req: any = { json: async () => ({ email: 'weird@err.com' }) }
    const res = await DELETE_ROUTE(req, { params: Promise.resolve({ slug: 'prof-del-3' }) } as any)
    expect(res.status).toBe(500)
  })

  it('POST returns 500 when grantProfileAccess throws a non-Error value', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'admin-post-2' } } }) },
        from: (table: string) => {
          if (table === 'profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p-admin-post-2', created_by: 'someone' } }) }) }) }
          return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'admin' } }) }) }) }
        }
      }))
    }))

    const mockGrant = jest.fn(async () => { throw {} })
    jest.doMock('@/lib/supabase-data-service', () => ({ grantProfileAccess: mockGrant }))

    let POST: any
    jest.isolateModules(() => {
      POST = require('../access/route').POST
    })

    const req: any = { json: async () => ({ email: 'throw@obj.com' }) }
    const res = await POST(req, { params: Promise.resolve({ slug: 'p-admin-post-2' }) } as any)
    expect(res.status).toBe(500)
  })

})
