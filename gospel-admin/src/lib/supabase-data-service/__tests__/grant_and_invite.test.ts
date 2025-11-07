describe('grantProfileAccess invite flow', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('invites new users when they do not exist', async () => {
    const profileId = 'p1'
    const emails = ['new1@example.com']

    const inviteMock = jest.fn(async (email: string) => ({ data: { user: { id: 'uid-' + email } }, error: null }))
    const upsertUserProfileMock = jest.fn(async () => ({ error: null }))

    // Mock the server module before importing the service so dynamic import in inviteCounseleeUsers picks it up
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn().mockResolvedValue({ from: () => ({ upsert: async () => ({ error: null }) }) }),
      createAdminClient: jest.fn().mockReturnValue({
        auth: { admin: { listUsers: async () => ({ data: { users: [] } }), inviteUserByEmail: inviteMock } },
        from: (table: string) => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { title: 'T', slug: 's' }, error: null }) }) }), upsert: upsertUserProfileMock })
      })
    }))

    const { grantProfileAccess } = await import('@/lib/supabase-data-service')

    await expect(grantProfileAccess(profileId, emails, 'g')).resolves.toBeUndefined()

    const server = await import('@/lib/supabase/server')
    expect(server.createAdminClient).toHaveBeenCalled()
    expect(inviteMock).toHaveBeenCalledWith('new1@example.com', expect.anything())
  })

  it('continues when invite API returns error', async () => {
    const profileId = 'p1'
    const emails = ['bad@example.com']

    const inviteMock = jest.fn(async () => ({ data: null, error: { message: 'fail' } }))

    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn().mockResolvedValue({ from: () => ({ upsert: async () => ({ error: null }) }) }),
      createAdminClient: jest.fn().mockReturnValue({
        auth: { admin: { listUsers: async () => ({ data: { users: [] } }), inviteUserByEmail: inviteMock } },
        from: (table: string) => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { title: 'T', slug: 's' }, error: null }) }) }), upsert: async () => ({ error: null }) })
      })
    }))

    const { grantProfileAccess } = await import('@/lib/supabase-data-service')

    await expect(grantProfileAccess(profileId, emails, 'g')).resolves.toBeUndefined()

    expect(inviteMock).toHaveBeenCalled()
  })
})
