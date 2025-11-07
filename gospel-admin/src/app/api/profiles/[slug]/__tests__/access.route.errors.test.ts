// Targeted tests for error and unauthorized branches in access.route
describe('access route error/unauth branches', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('GET returns 401 when no authenticated user', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: null } }) }
      }))
    }))

    let GET: any
    jest.isolateModules(() => {
      GET = require('../access/route').GET
    })

    const res = await GET({} as any, { params: Promise.resolve({ slug: 's' }) } as any)
    expect(res.status).toBe(401)
  })

  it('POST returns 401 when no authenticated user', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }))
    }))

    let POST: any
    jest.isolateModules(() => {
      POST = require('../access/route').POST
    })

    const req: any = { json: async () => ({ email: 'a@b.com' }) }
    const res = await POST(req, { params: Promise.resolve({ slug: 's' }) } as any)
    expect(res.status).toBe(401)
  })

  it('DELETE returns 401 when no authenticated user', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }))
    }))

    let DELETE_ROUTE: any
    jest.isolateModules(() => {
      DELETE_ROUTE = require('../access/route').DELETE
    })

    const req: any = { json: async () => ({ email: 'a@b.com' }) }
    const res = await DELETE_ROUTE(req, { params: Promise.resolve({ slug: 's' }) } as any)
    expect(res.status).toBe(401)
  })

  it('GET returns 500 when createClient throws', async () => {
    jest.doMock('@/lib/supabase/server', () => ({ createClient: jest.fn(async () => { throw new Error('boom create') }) }))

    let GET: any
    jest.isolateModules(() => {
      GET = require('../access/route').GET
    })

    const res = await GET({} as any, { params: Promise.resolve({ slug: 's' }) } as any)
    expect(res.status).toBe(500)
  })

  it('POST returns 500 when createClient throws', async () => {
    jest.doMock('@/lib/supabase/server', () => ({ createClient: jest.fn(async () => { throw new Error('boom create') }) }))

    let POST: any
    jest.isolateModules(() => {
      POST = require('../access/route').POST
    })

    const req: any = { json: async () => ({ email: 'a@b.com' }) }
    const res = await POST(req, { params: Promise.resolve({ slug: 's' }) } as any)
    expect(res.status).toBe(500)
  })

  it('DELETE returns 500 when createClient throws', async () => {
    jest.doMock('@/lib/supabase/server', () => ({ createClient: jest.fn(async () => { throw new Error('boom create') }) }))

    let DELETE_ROUTE: any
    jest.isolateModules(() => {
      DELETE_ROUTE = require('../access/route').DELETE
    })

    const req: any = { json: async () => ({ email: 'a@b.com' }) }
    const res = await DELETE_ROUTE(req, { params: Promise.resolve({ slug: 's' }) } as any)
    expect(res.status).toBe(500)
  })

  it('GET returns 403 when userProfile missing and not owner', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'u-x' } } }) },
        from: (table: string) => {
          if (table === 'profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'px', created_by: 'other' } }) }) }) }
          return { select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) }
        }
      }))
    }))

    let GET: any
    jest.isolateModules(() => {
      GET = require('../access/route').GET
    })

    const res = await GET({} as any, { params: Promise.resolve({ slug: 'px' }) } as any)
    expect(res.status).toBe(403)
  })

})
