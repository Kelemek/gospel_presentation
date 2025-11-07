// Second batch of targeted tests for hard-to-hit branches in access.route
describe('access route additional edge cases II', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('POST returns 400 when body has no email property', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u-noemail' } } }) } }))
    }))

    let POST: any
    jest.isolateModules(() => {
      POST = require('../access/route').POST
    })

    const req: any = { json: async () => ({}) }
    const res = await POST(req, { params: Promise.resolve({ slug: 'p-noemail' }) } as any)
    expect(res.status).toBe(400)
  })

  it('DELETE returns 400 when body has no email property', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u-noemail' } } }) } }))
    }))

    let DELETE_ROUTE: any
    jest.isolateModules(() => {
      DELETE_ROUTE = require('../access/route').DELETE
    })

    const req: any = { json: async () => ({}) }
    const res = await DELETE_ROUTE(req, { params: Promise.resolve({ slug: 'p-noemail' }) } as any)
    expect(res.status).toBe(400)
  })

  it('POST returns 403 when userProfile role is undefined and not owner', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'u-undef' } } }) },
        from: (table: string) => {
          if (table === 'profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p-undef', created_by: 'someone' } }) }) }) }
          return { select: () => ({ eq: () => ({ single: async () => ({ data: {} }) }) }) }
        }
      }))
    }))

    let POST: any
    jest.isolateModules(() => {
      POST = require('../access/route').POST
    })

    const req: any = { json: async () => ({ email: 'a@b.com' }) }
    const res = await POST(req, { params: Promise.resolve({ slug: 'p-undef' }) } as any)
    expect(res.status).toBe(403)
  })

  it('GET returns 403 when userProfile is null and not owner', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'u-null' } } }) },
        from: (table: string) => {
          if (table === 'profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p-null', created_by: 'owner-x' } }) }) }) }
          return { select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) }
        }
      }))
    }))

    let GET: any
    jest.isolateModules(() => {
      GET = require('../access/route').GET
    })

    const res = await GET({} as any, { params: Promise.resolve({ slug: 'p-null' }) } as any)
    expect(res.status).toBe(403)
  })

  it('POST returns 500 when grantProfileAccess rejects with string', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'u-rej' } } }) },
        from: (table: string) => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p-rej', created_by: 'u-rej' } }) }) }) })
      }))
    }))

    jest.doMock('@/lib/supabase-data-service', () => ({ grantProfileAccess: jest.fn(async () => { throw 'err-string' }) }))

    let POST: any
    jest.isolateModules(() => {
      POST = require('../access/route').POST
    })

    const req: any = { json: async () => ({ email: 'x@x.com' }) }
    const res = await POST(req, { params: Promise.resolve({ slug: 'p-rej' }) } as any)
    expect(res.status).toBe(500)
  })

  it('DELETE returns 500 when revokeProfileAccess rejects with string', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'u-rej2' } } }) },
        from: (table: string) => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p-rej2', created_by: 'u-rej2' } }) }) }) })
      }))
    }))

    jest.doMock('@/lib/supabase-data-service', () => ({ revokeProfileAccess: jest.fn(async () => { throw 'err2' }) }))

    let DELETE_ROUTE: any
    jest.isolateModules(() => {
      DELETE_ROUTE = require('../access/route').DELETE
    })

    const req: any = { json: async () => ({ email: 'y@y.com' }) }
    const res = await DELETE_ROUTE(req, { params: Promise.resolve({ slug: 'p-rej2' }) } as any)
    expect(res.status).toBe(500)
  })

})
