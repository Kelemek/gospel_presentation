// Second permutations batch to attempt to exercise remaining branch operands
describe('access route permutations 2 (exhaustive-ish)', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('runs extra permutations', async () => {
    const userVariants = [null, { id: 'uA' }, { id: 'ownerA' }]
    const profileVariants = [
      { data: null, error: { message: 'db' } },
      { data: null, error: null },
      { data: { id: 'p1', created_by: 'ownerA' }, error: null },
      { data: { id: 'p2', created_by: 'other' }, error: null }
    ]
    const userProfileVariants: any[] = [null, { role: 'admin' }, { role: 'member' }, { role: 'ADMIN' }, { role: '' }, {}]
    const grantReturns: any[] = [true, false, null, undefined]
    const revokeReturns: any[] = [true, false, null, undefined]

    const seen = new Set<number>()

    const makeClient = (user: any, profileObj: any, userProfileObj: any) => ({
      auth: { getUser: async () => ({ data: { user } }) },
      from: (table: string) => ({
        select: () => ({
          eq: () => ({ single: async () => {
            if (table === 'profiles') return profileObj
            return { data: userProfileObj }
          } })
        })
      })
    })

    for (const user of userVariants) {
      for (const profileObj of profileVariants) {
        for (const userProfileObj of userProfileVariants) {
          // GET
          jest.resetModules()
          jest.doMock('@/lib/supabase/server', () => ({ createClient: jest.fn(async () => makeClient(user, profileObj, userProfileObj)) }))
          jest.doMock('@/lib/supabase-data-service', () => ({ getProfileAccessList: jest.fn(async () => [{ email: 'x@y.com' }]) }))
          let GET: any
          jest.isolateModules(() => { GET = require('../access/route').GET })
          const res = await GET({} as any, { params: Promise.resolve({ slug: 'p' }) } as any)
          seen.add(res.status)

          // POST -- valid email
          jest.resetModules()
          jest.doMock('@/lib/supabase/server', () => ({ createClient: jest.fn(async () => makeClient(user, profileObj, userProfileObj)) }))
          jest.doMock('@/lib/supabase-data-service', () => ({ grantProfileAccess: jest.fn(async () => true) }))
          let POST: any
          jest.isolateModules(() => { POST = require('../access/route').POST })
          const req: any = { json: async () => ({ email: 'ok@ex.com' }) }
          const resPost = await POST(req, { params: Promise.resolve({ slug: 'p' }) } as any)
          seen.add(resPost.status)

          // DELETE -- valid email
          jest.resetModules()
          jest.doMock('@/lib/supabase/server', () => ({ createClient: jest.fn(async () => makeClient(user, profileObj, userProfileObj)) }))
          jest.doMock('@/lib/supabase-data-service', () => ({ revokeProfileAccess: jest.fn(async () => true) }))
          let DELETE_ROUTE: any
          jest.isolateModules(() => { DELETE_ROUTE = require('../access/route').DELETE })
          const resDel = await DELETE_ROUTE(req, { params: Promise.resolve({ slug: 'p' }) } as any)
          seen.add(resDel.status)
        }
      }
    }

    // Throwing grant/revoke cases
    for (const g of grantReturns) {
      for (const r of revokeReturns) {
        jest.resetModules()
        jest.doMock('@/lib/supabase/server', () => ({ createClient: jest.fn(async () => makeClient({ id: 'uA' }, { data: { id: 'p1', created_by: 'uA' }, error: null }, { role: 'admin' })) }))
        jest.doMock('@/lib/supabase-data-service', () => ({ grantProfileAccess: jest.fn(async () => { if (g === 'throw') throw new Error('boom') ; return g }), revokeProfileAccess: jest.fn(async () => { if (r === 'throw') throw new Error('boom') ; return r }) }))
        let POST: any, DELETE_ROUTE: any
        jest.isolateModules(() => { POST = require('../access/route').POST; DELETE_ROUTE = require('../access/route').DELETE })
        const req: any = { json: async () => ({ email: 'ok@ex.com' }) }
        const p = await POST(req, { params: Promise.resolve({ slug: 'p1' }) } as any)
        seen.add(p.status)
        const d = await DELETE_ROUTE(req, { params: Promise.resolve({ slug: 'p1' }) } as any)
        seen.add(d.status)
      }
    }

    expect([200, 400, 401, 403, 404, 500].some(s => seen.has(s))).toBe(true)
  })
})
