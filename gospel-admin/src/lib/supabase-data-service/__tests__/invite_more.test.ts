describe('inviteCounseleeUsers additional branches', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('inviteCounseleeUsers returns early when all users exist', async () => {
    jest.resetModules()
    jest.clearAllMocks()

    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn().mockResolvedValue({ from: () => ({ upsert: async () => ({ error: null }) }) }),
      createAdminClient: jest.fn().mockReturnValue({
        auth: { admin: { listUsers: async () => ({ data: { users: [{ email: 'exists@example.com' }] } }) } },
        from: (table: string) => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { title: 'T', slug: 's' }, error: null }) }) }) })
      })
    }))

    const { grantProfileAccess } = await import('@/lib/supabase-data-service')

    // grantProfileAccess will call inviteCounseleeUsers internally; ensure it resolves when users already exist
    await expect(grantProfileAccess('p1', ['exists@example.com'], 'g')).resolves.toBeUndefined()
  })

  it('inviteCounseleeUsers handles invite exceptions gracefully', async () => {
    jest.resetModules()
    jest.clearAllMocks()

    const inviteMock = jest.fn(async () => { throw new Error('boom') })

    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn().mockResolvedValue({ from: () => ({ upsert: async () => ({ error: null }) }) }),
      createAdminClient: jest.fn().mockReturnValue({
        auth: { admin: { listUsers: async () => ({ data: { users: [] } }), inviteUserByEmail: inviteMock } },
        from: (table: string) => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { title: 'T', slug: 's' }, error: null }) }) }), upsert: async () => ({ error: null }) })
      })
    }))

    const { grantProfileAccess } = await import('@/lib/supabase-data-service')

    await expect(grantProfileAccess('p1', ['whoops@example.com'], 'g')).resolves.toBeUndefined()
    expect(inviteMock).toHaveBeenCalled()
  })
})
