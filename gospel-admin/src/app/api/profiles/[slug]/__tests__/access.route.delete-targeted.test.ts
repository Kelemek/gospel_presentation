// Focused DELETE route tests to exercise revoke branches
describe('access route DELETE - targeted branches', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('DELETE successfully revokes access and returns 200', async () => {
    const mockRevoke = jest.fn().mockResolvedValue(undefined)

    // Mock supabase client with authenticated owner user and profile
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'owner-1' } } }) },
        from: (table: string) => {
          if (table === 'profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p1', created_by: 'owner-1' } }) }) }) }
          if (table === 'user_profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'user' } }) }) }) }
          return { select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) }
        }
      }))
    }))

    jest.doMock('@/lib/supabase-data-service', () => ({
      revokeProfileAccess: mockRevoke,
      grantProfileAccess: jest.fn(),
      getProfileAccessList: jest.fn()
    }))

    let DELETE_ROUTE: any
    jest.isolateModules(() => {
      DELETE_ROUTE = require('../access/route').DELETE
    })

    const req: any = { json: async () => ({ email: '  A@B.COM  ' }) }
    const res = await DELETE_ROUTE(req, { params: Promise.resolve({ slug: 'p1' }) } as any)

    expect(res.status).toBe(200)
    // ensure revoke called with trimmed/lowercased email
    expect(mockRevoke).toHaveBeenCalledWith('p1', 'a@b.com')
  })

  it('DELETE returns 500 when revokeProfileAccess throws', async () => {
    const mockRevoke = jest.fn().mockRejectedValue(new Error('db fail'))

    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'owner-1' } } }) },
        from: (table: string) => {
          if (table === 'profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p1', created_by: 'owner-1' } }) }) }) }
          if (table === 'user_profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'user' } }) }) }) }
          return { select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) }
        }
      }))
    }))

    jest.doMock('@/lib/supabase-data-service', () => ({
      revokeProfileAccess: mockRevoke,
      grantProfileAccess: jest.fn(),
      getProfileAccessList: jest.fn()
    }))

    let DELETE_ROUTE: any
    jest.isolateModules(() => {
      DELETE_ROUTE = require('../access/route').DELETE
    })

    const req: any = { json: async () => ({ email: 'x@y.com' }) }
    const res = await DELETE_ROUTE(req, { params: Promise.resolve({ slug: 'p1' }) } as any)

    expect(res.status).toBe(500)
  })

})
