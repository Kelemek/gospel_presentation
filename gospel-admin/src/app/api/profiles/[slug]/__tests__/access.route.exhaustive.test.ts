// Programmatic exhaustive permutations for DELETE to exercise branch combinations
describe('access route DELETE exhaustive permutations', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  const scenarios = [] as Array<{
    name: string
    isAdmin: boolean
    isOwner: boolean
    revokeBehavior: 'ok' | 'error' | 'nonError'
  }>

  ;['ok','error','nonError'].forEach((revokeBehavior) => {
    ;[true, false].forEach((isAdmin) => {
      ;[true, false].forEach((isOwner) => {
        scenarios.push({ name: `admin:${isAdmin} owner:${isOwner} revoke:${revokeBehavior}`, isAdmin, isOwner, revokeBehavior: revokeBehavior as any })
      })
    })
  })

  scenarios.forEach((s) => {
    it(s.name, async () => {
      // build user and profile ids such that owner condition matches
      const userId = s.isOwner ? 'u-owner' : 'u-other'
      const profileCreator = s.isOwner ? 'u-owner' : 'someone-else'

      jest.doMock('@/lib/supabase/server', () => ({
        createClient: jest.fn(async () => ({
          auth: { getUser: async () => ({ data: { user: { id: userId } } }) },
          from: (table: string) => {
            if (table === 'profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p-x', created_by: profileCreator } }) }) }) }
            return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: s.isAdmin ? 'admin' : 'member' } }) }) }) }
          }
        }))
      }))

      const mockRevoke = jest.fn(async () => {
        if (s.revokeBehavior === 'ok') return
        if (s.revokeBehavior === 'error') throw new Error('boom')
        throw {}
      })
      jest.doMock('@/lib/supabase-data-service', () => ({ revokeProfileAccess: mockRevoke }))

      let DELETE_ROUTE: any
      jest.isolateModules(() => {
        DELETE_ROUTE = require('../access/route').DELETE
      })

      const req: any = { json: async () => ({ email: 'x@y.com' }) }
      const res = await DELETE_ROUTE(req, { params: Promise.resolve({ slug: 'p-x' }) } as any)

      // expected: if not admin and not owner -> 403; else if revoke throws -> 500; else 200
      if (!s.isAdmin && !s.isOwner) {
        expect(res.status).toBe(403)
      } else if (s.revokeBehavior !== 'ok') {
        expect(res.status).toBe(500)
      } else {
        expect(res.status).toBe(200)
      }
    })
  })

})
