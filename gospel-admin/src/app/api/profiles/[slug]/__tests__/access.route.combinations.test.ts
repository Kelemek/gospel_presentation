// Combination tests to exercise multiple permission and validation branches
describe('access route combinations (minimal)', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('GET returns 200 for admin with empty access list', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'admin-x' } } }) },
        from: (table: string) => {
          if (table === 'profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p-empty', created_by: 'owner' } }) }) }) }
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

    const res = await GET({} as any, { params: Promise.resolve({ slug: 'p-empty' }) } as any)
    expect(res.status).toBe(200)
  })

  it('GET returns 403 when userProfile role is member and not owner', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'm1' } } }) },
        from: (table: string) => {
          if (table === 'profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'pm', created_by: 'owner' } }) }) }) }
          return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'member' } }) }) }) }
        }
      }))
    }))

    let GET: any
    jest.isolateModules(() => {
      GET = require('../access/route').GET
    })

    const res = await GET({} as any, { params: Promise.resolve({ slug: 'pm' }) } as any)
    expect(res.status).toBe(403)
  })

  it('POST normalizes and accepts uppercase email from owner', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'owner-1' } } }) },
        from: (table: string) => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'po', created_by: 'owner-1' } }) }) }) })
      }))
    }))

    jest.doMock('@/lib/supabase-data-service', () => ({
      grantProfileAccess: jest.fn(async () => true)
    }))

    let POST: any
    jest.isolateModules(() => {
      POST = require('../access/route').POST
    })

    const req: any = { json: async () => ({ email: 'UPPER@EX.COM' }) }
    const res = await POST(req, { params: Promise.resolve({ slug: 'po' }) } as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.email).toBe('upper@ex.com')
  })

  it('POST rejects invalid email format', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) } }))
    }))

    let POST: any
    jest.isolateModules(() => {
      POST = require('../access/route').POST
    })

    const req: any = { json: async () => ({ email: 'bad-email' }) }
    const res = await POST(req, { params: Promise.resolve({ slug: 'p1' }) } as any)
    expect(res.status).toBe(400)
  })

  it('DELETE allows owner even when userProfile role is member', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'owner-2' } } }) },
        from: (table: string) => {
          if (table === 'profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'po2', created_by: 'owner-2' } }) }) }) }
          return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'member' } }) }) }) }
        }
      }))
    }))

    jest.doMock('@/lib/supabase-data-service', () => ({
      revokeProfileAccess: jest.fn(async () => true)
    }))

    let DELETE_ROUTE: any
    jest.isolateModules(() => {
      DELETE_ROUTE = require('../access/route').DELETE
    })

    const req: any = { json: async () => ({ email: 'a@b.com' }) }
    const res = await DELETE_ROUTE(req, { params: Promise.resolve({ slug: 'po2' }) } as any)
    expect(res.status).toBe(200)
  })

  it('DELETE returns 403 when not admin and not owner', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'u-no' } } }) },
        from: (table: string) => {
          if (table === 'profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'px', created_by: 'someone' } }) }) }) }
          return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'member' } }) }) }) }
        }
      }))
    }))

    let DELETE_ROUTE: any
    jest.isolateModules(() => {
      DELETE_ROUTE = require('../access/route').DELETE
    })

    const req: any = { json: async () => ({ email: 'a@b.com' }) }
    const res = await DELETE_ROUTE(req, { params: Promise.resolve({ slug: 'px' }) } as any)
    expect(res.status).toBe(403)
  })
})
