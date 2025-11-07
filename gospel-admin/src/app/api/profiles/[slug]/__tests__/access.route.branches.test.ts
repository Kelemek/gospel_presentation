// Branch and error-path tests for the profiles access route
describe('profiles access route (branches and errors)', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('GET returns 401 when unauthenticated', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } })),
    }))

    let GET: any
    jest.isolateModules(() => {
      GET = require('../access/route').GET
    })

    const res = await GET({} as any, { params: Promise.resolve({ slug: 'x' }) } as any)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toMatch(/Unauthorized/i)
  })

  it('GET returns 404 when profile not found', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
        from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null, error: { message: 'not found' } }) }) }) })
      }))
    }))

    let GET: any
    jest.isolateModules(() => {
      GET = require('../access/route').GET
    })

    const res = await GET({} as any, { params: Promise.resolve({ slug: 'nope' }) } as any)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toMatch(/Profile not found/i)
  })

  it('GET returns 403 when user lacks permission', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'u2' } } }) },
        from: (table: string) => {
          if (table === 'profiles') {
            return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p1', created_by: 'owner' } }) }) }) }
          }
          // user_profiles
          return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'member' } }) }) }) }
        }
      }))
    }))

    let GET: any
    jest.isolateModules(() => {
      GET = require('../access/route').GET
    })

    const res = await GET({} as any, { params: Promise.resolve({ slug: 'p1' }) } as any)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toMatch(/Forbidden/i)
  })

  it('POST returns 400 for invalid email format', async () => {
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
    const body = await res.json()
    expect(body.error).toMatch(/Invalid email format|Valid email is required/i)
  })

  it('POST returns 404 when profile missing', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
        from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null, error: { message: 'not found' } }) }) }) })
      }))
    }))

    let POST: any
    jest.isolateModules(() => {
      POST = require('../access/route').POST
    })

    const req: any = { json: async () => ({ email: 'a@b.com' }) }
    const res = await POST(req, { params: Promise.resolve({ slug: 'nope' }) } as any)
    expect(res.status).toBe(404)
  })

  it('DELETE returns 400 when email missing/invalid', async () => {
    // Auth short-circuit not needed because validation runs before profile lookup
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) } }))
    }))

    let DELETE_ROUTE: any
    jest.isolateModules(() => {
      DELETE_ROUTE = require('../access/route').DELETE
    })

    const req: any = { json: async () => ({ email: '' }) }
    const res = await DELETE_ROUTE(req, { params: Promise.resolve({ slug: 'p1' }) } as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/Valid email is required/i)
  })

  it('GET allows admin users to fetch access list', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'admin' } } }) },
        from: (table: string) => {
          if (table === 'profiles') {
            return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p-admin', created_by: 'owner' } }) }) }) }
          }
          return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'admin' } }) }) }) }
        }
      }))
    }))

    jest.doMock('@/lib/supabase-data-service', () => ({
      getProfileAccessList: jest.fn(async (id: string) => [{ email: 'admin@a.com' }])
    }))

    let GET: any
    jest.isolateModules(() => {
      GET = require('../access/route').GET
    })

    const res = await GET({} as any, { params: Promise.resolve({ slug: 'p-admin' }) } as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.access).toBeInstanceOf(Array)
  })

  it('POST returns 403 when user lacks permission to grant access', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'other' } } }) },
        from: (table: string) => {
          if (table === 'profiles') {
            return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p2', created_by: 'owner' } }) }) }) }
          }
          return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'member' } }) }) }) }
        }
      }))
    }))

    let POST: any
    jest.isolateModules(() => {
      POST = require('../access/route').POST
    })

    const req: any = { json: async () => ({ email: 'a@b.com' }) }
    const res = await POST(req, { params: Promise.resolve({ slug: 'p2' }) } as any)
    expect(res.status).toBe(403)
  })

  it('DELETE returns 403 when user lacks permission to revoke access', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'other' } } }) },
        from: (table: string) => {
          if (table === 'profiles') {
            return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p2', created_by: 'owner' } }) }) }) }
          }
          return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'member' } }) }) }) }
        }
      }))
    }))

    let DELETE_ROUTE: any
    jest.isolateModules(() => {
      DELETE_ROUTE = require('../access/route').DELETE
    })

    const req: any = { json: async () => ({ email: 'a@b.com' }) }
    const res = await DELETE_ROUTE(req, { params: Promise.resolve({ slug: 'p2' }) } as any)
    expect(res.status).toBe(403)
  })

  it('POST allows owner to grant access', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) },
        from: (table: string) => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p-owner', created_by: 'owner' } }) }) }) })
      }))
    }))

    jest.doMock('@/lib/supabase-data-service', () => ({
      grantProfileAccess: jest.fn(async () => true)
    }))

    let POST: any
    jest.isolateModules(() => {
      POST = require('../access/route').POST
    })

    const req: any = { json: async () => ({ email: 'Owner@Example.Com' }) }
    const res = await POST(req, { params: Promise.resolve({ slug: 'p-owner' }) } as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.email).toBe('owner@example.com')
  })

  it('DELETE allows owner to revoke access', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) },
        from: (table: string) => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p-owner', created_by: 'owner' } }) }) }) })
      }))
    }))

    jest.doMock('@/lib/supabase-data-service', () => ({
      revokeProfileAccess: jest.fn(async () => true)
    }))

    let DELETE_ROUTE: any
    jest.isolateModules(() => {
      DELETE_ROUTE = require('../access/route').DELETE
    })

    const req: any = { json: async () => ({ email: 'user@ex.com' }) }
    const res = await DELETE_ROUTE(req, { params: Promise.resolve({ slug: 'p-owner' }) } as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.email).toBe('user@ex.com')
  })

  it('POST returns 400 when body missing', async () => {
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

  it('POST allows admin to grant access', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'admin1' } } }) },
        from: (table: string) => {
          if (table === 'profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p3', created_by: 'someone' } }) }) }) }
          // Return an admin role for user_profiles
          return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'admin' } }) }) }) }
        }
      }))
    }))

    jest.doMock('@/lib/supabase-data-service', () => ({
      grantProfileAccess: jest.fn(async () => true)
    }))

    let POST: any
    jest.isolateModules(() => {
      POST = require('../access/route').POST
    })

    const req: any = { json: async () => ({ email: 'adm@example.com' }) }
    const res = await POST(req, { params: Promise.resolve({ slug: 'p3' }) } as any)
    expect(res.status).toBe(200)
  })

  it('DELETE allows admin to revoke access', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'admin1' } } }) },
        from: (table: string) => {
          if (table === 'profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p3', created_by: 'someone' } }) }) }) }
          // Return an admin role for user_profiles
          return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'admin' } }) }) }) }
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

    const req: any = { json: async () => ({ email: 'admrev@example.com' }) }
    const res = await DELETE_ROUTE(req, { params: Promise.resolve({ slug: 'p3' }) } as any)
    expect(res.status).toBe(200)
  })

  it('POST returns 400 when email is non-string', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) } }))
    }))

    let POST: any
    jest.isolateModules(() => {
      POST = require('../access/route').POST
    })

    const req: any = { json: async () => ({ email: 12345 }) }
    const res = await POST(req, { params: Promise.resolve({ slug: 'p1' }) } as any)
    expect(res.status).toBe(400)
  })

  it('DELETE returns 400 when email is non-string', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) } }))
    }))

    let DELETE_ROUTE: any
    jest.isolateModules(() => {
      DELETE_ROUTE = require('../access/route').DELETE
    })

    const req: any = { json: async () => ({ email: 12345 }) }
    const res = await DELETE_ROUTE(req, { params: Promise.resolve({ slug: 'p1' }) } as any)
    expect(res.status).toBe(400)
  })

  it('GET returns 403 when userProfile row is missing', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'u-no-role' } } }) },
        from: (table: string) => {
          if (table === 'profiles') {
            return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p4', created_by: 'owner' } }) }) }) }
          }
          // simulate missing user_profiles row
          return { select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) }
        }
      }))
    }))

    let GET: any
    jest.isolateModules(() => {
      GET = require('../access/route').GET
    })

    const res = await GET({} as any, { params: Promise.resolve({ slug: 'p4' }) } as any)
    expect(res.status).toBe(403)
  })

  it('POST returns 400 when email is whitespace only', async () => {
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

    const req: any = { json: async () => ({ email: '   ' }) }
    const res = await POST(req, { params: Promise.resolve({ slug: 'p1' }) } as any)
    expect(res.status).toBe(400)
  })

  it('DELETE returns 403 when userProfile role is undefined', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'u-undef' } } }) },
        from: (table: string) => {
          if (table === 'profiles') {
            return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p5', created_by: 'owner' } }) }) }) }
          }
          return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: undefined } }) }) }) }
        }
      }))
    }))

    let DELETE_ROUTE: any
    jest.isolateModules(() => {
      DELETE_ROUTE = require('../access/route').DELETE
    })

    const req: any = { json: async () => ({ email: 'a@b.com' }) }
    const res = await DELETE_ROUTE(req, { params: Promise.resolve({ slug: 'p5' }) } as any)
    expect(res.status).toBe(403)
  })

  it('POST returns 401 when unauthenticated', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }))
    }))

    let POST: any
    jest.isolateModules(() => {
      POST = require('../access/route').POST
    })

    const req: any = { json: async () => ({ email: 'a@b.com' }) }
    const res = await POST(req, { params: Promise.resolve({ slug: 'p1' }) } as any)
    expect(res.status).toBe(401)
  })

  it('DELETE returns 401 when unauthenticated', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }))
    }))

    let DELETE_ROUTE: any
    jest.isolateModules(() => {
      DELETE_ROUTE = require('../access/route').DELETE
    })

    const req: any = { json: async () => ({ email: 'a@b.com' }) }
    const res = await DELETE_ROUTE(req, { params: Promise.resolve({ slug: 'p1' }) } as any)
    expect(res.status).toBe(401)
  })

  it('DELETE returns 404 when profile missing', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
        from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null, error: { message: 'not found' } }) }) }) })
      }))
    }))

    let DELETE_ROUTE: any
    jest.isolateModules(() => {
      DELETE_ROUTE = require('../access/route').DELETE
    })

    const req: any = { json: async () => ({ email: 'a@b.com' }) }
    const res = await DELETE_ROUTE(req, { params: Promise.resolve({ slug: 'nope' }) } as any)
    expect(res.status).toBe(404)
  })

  it('GET returns 500 when data service throws', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
        from: (table: string) => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p1', created_by: 'u1' } }) }) }) })
      }))
    }))

    jest.doMock('@/lib/supabase-data-service', () => ({
      getProfileAccessList: jest.fn(async () => { throw new Error('boom') })
    }))

    let GET: any
    jest.isolateModules(() => {
      GET = require('../access/route').GET
    })

    const res = await GET({} as any, { params: Promise.resolve({ slug: 'p1' }) } as any)
    expect(res.status).toBe(500)
  })

  it('POST returns 500 when grantProfileAccess throws', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
        from: (table: string) => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p1', created_by: 'u1' } }) }) }) })
      }))
    }))

    jest.doMock('@/lib/supabase-data-service', () => ({
      grantProfileAccess: jest.fn(async () => { throw new Error('grant fail') })
    }))

    let POST: any
    jest.isolateModules(() => {
      POST = require('../access/route').POST
    })

    const req: any = { json: async () => ({ email: 'ok@example.com' }) }
    const res = await POST(req, { params: Promise.resolve({ slug: 'p1' }) } as any)
    expect(res.status).toBe(500)
  })

  it('DELETE returns 500 when revokeProfileAccess throws', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
        from: (table: string) => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p1', created_by: 'u1' } }) }) }) })
      }))
    }))

    jest.doMock('@/lib/supabase-data-service', () => ({
      revokeProfileAccess: jest.fn(async () => { throw new Error('revoke fail') })
    }))

    let DELETE_ROUTE: any
    jest.isolateModules(() => {
      DELETE_ROUTE = require('../access/route').DELETE
    })

    const req: any = { json: async () => ({ email: 'ok@example.com' }) }
    const res = await DELETE_ROUTE(req, { params: Promise.resolve({ slug: 'p1' }) } as any)
    expect(res.status).toBe(500)
  })
})
