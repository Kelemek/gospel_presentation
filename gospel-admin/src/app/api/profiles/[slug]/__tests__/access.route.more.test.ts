// Additional focused tests flipping specific boolean branches
describe('access route more branches (batch)', () => {
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
    const res = await POST(req, { params: Promise.resolve({ slug: 's' }) } as any)
    expect(res.status).toBe(400)
  })

  it('POST returns 400 when email is empty string after trim', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u-empty' } } }) } }))
    }))

    let POST: any
    jest.isolateModules(() => {
      POST = require('../access/route').POST
    })

    const req: any = { json: async () => ({ email: '   ' }) }
    const res = await POST(req, { params: Promise.resolve({ slug: 's' }) } as any)
    expect(res.status).toBe(400)
  })

  it('GET succeeds when user is profile owner (owner true, admin false)', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'owner-true' } } }) },
        from: (table: string) => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'po', created_by: 'owner-true' } }) }) }) })
      }))
    }))

    jest.doMock('@/lib/supabase-data-service', () => ({ getProfileAccessList: jest.fn(async () => []) }))

    let GET: any
    jest.isolateModules(() => {
      GET = require('../access/route').GET
    })

    const res = await GET({} as any, { params: Promise.resolve({ slug: 'po' }) } as any)
    expect(res.status).toBe(200)
  })

  it('POST returns 200 when owner grants access and grantProfileAccess returns truthy', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'owner-g' } } }) },
        from: (table: string) => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'pg', created_by: 'owner-g' } }) }) }) })
      }))
    }))

    jest.doMock('@/lib/supabase-data-service', () => ({ grantProfileAccess: jest.fn(async () => true) }))

    let POST: any
    jest.isolateModules(() => {
      POST = require('../access/route').POST
    })

    const req: any = { json: async () => ({ email: 'ok@ex.com' }) }
    const res = await POST(req, { params: Promise.resolve({ slug: 'pg' }) } as any)
    expect(res.status).toBe(200)
  })

  it('DELETE returns 200 when owner revokes and revokeProfileAccess returns truthy', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'owner-r' } } }) },
        from: (table: string) => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'pr', created_by: 'owner-r' } }) }) }) })
      }))
    }))

    jest.doMock('@/lib/supabase-data-service', () => ({ revokeProfileAccess: jest.fn(async () => true) }))

    let DELETE_ROUTE: any
    jest.isolateModules(() => {
      DELETE_ROUTE = require('../access/route').DELETE
    })

    const req: any = { json: async () => ({ email: 'ok@ex.com' }) }
    const res = await DELETE_ROUTE(req, { params: Promise.resolve({ slug: 'pr' }) } as any)
    expect(res.status).toBe(200)
  })

  it('GET returns 403 when userProfile is undefined and user is not owner (explicit)', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'u-undef' } } }) },
        from: (table: string) => {
          if (table === 'profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p-ud', created_by: 'someone' } }) }) }) }
          return { select: () => ({ eq: () => ({ single: async () => ({ data: undefined }) }) }) }
        }
      }))
    }))

    let GET: any
    jest.isolateModules(() => {
      GET = require('../access/route').GET
    })

    const res = await GET({} as any, { params: Promise.resolve({ slug: 'p-ud' }) } as any)
    expect(res.status).toBe(403)
  })

})
