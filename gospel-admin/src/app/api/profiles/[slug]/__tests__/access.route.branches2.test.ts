// More targeted branch tests for access.route
describe('access route branches (extra 2)', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('GET returns 404 when profile query returns an error object', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'u-e' } } }) },
        from: (table: string) => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null, error: { message: 'db' } }) }) }) })
      }))
    }))

    let GET: any
    jest.isolateModules(() => {
      GET = require('../access/route').GET
    })

    const res = await GET({} as any, { params: Promise.resolve({ slug: 'px' }) } as any)
    expect(res.status).toBe(404)
  })

  it('POST returns 404 when profile data is null (no error)', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'u-n' } } }) },
        from: (table: string) => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) })
      }))
    }))

    let POST: any
    jest.isolateModules(() => {
      POST = require('../access/route').POST
    })

    const req: any = { json: async () => ({ email: 'a@b.com' }) }
    const res = await POST(req, { params: Promise.resolve({ slug: 'px' }) } as any)
    expect(res.status).toBe(404)
  })

  it('DELETE returns 404 when profile query errors', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'u-e2' } } }) },
        from: (table: string) => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null, error: { message: 'fail' } }) }) }) })
      }))
    }))

    let DELETE_ROUTE: any
    jest.isolateModules(() => {
      DELETE_ROUTE = require('../access/route').DELETE
    })

    const req: any = { json: async () => ({ email: 'a@b.com' }) }
    const res = await DELETE_ROUTE(req, { params: Promise.resolve({ slug: 'px' }) } as any)
    expect(res.status).toBe(404)
  })

  it('GET returns 403 when userProfile is missing (null) and user is not owner', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'u-m' } } }) },
        from: (table: string) => {
          if (table === 'profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p-m', created_by: 'other' } }) }) }) }
          return { select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) }
        }
      }))
    }))

    let GET: any
    jest.isolateModules(() => {
      GET = require('../access/route').GET
    })

    const res = await GET({} as any, { params: Promise.resolve({ slug: 'p-m' }) } as any)
    expect(res.status).toBe(403)
  })

  it('POST returns 403 when userProfile role is member and not owner', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'u-member' } } }) },
        from: (table: string) => {
          if (table === 'profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p-mb', created_by: 'other' } }) }) }) }
          return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'member' } }) }) }) }
        }
      }))
    }))

    let POST: any
    jest.isolateModules(() => {
      POST = require('../access/route').POST
    })

    const req: any = { json: async () => ({ email: 'ok@ex.com' }) }
    const res = await POST(req, { params: Promise.resolve({ slug: 'p-mb' }) } as any)
    expect(res.status).toBe(403)
  })

  it('GET returns 500 when getProfileAccessList throws', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'u-ok' } } }) },
        from: (table: string) => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p-ok', created_by: 'u-ok' } }) }) }) })
      }))
    }))

    jest.doMock('@/lib/supabase-data-service', () => ({
      getProfileAccessList: jest.fn(async () => { throw new Error('boom access list') })
    }))

    let GET: any
    jest.isolateModules(() => {
      GET = require('../access/route').GET
    })

    const res = await GET({} as any, { params: Promise.resolve({ slug: 'p-ok' }) } as any)
    expect(res.status).toBe(500)
  })

})
