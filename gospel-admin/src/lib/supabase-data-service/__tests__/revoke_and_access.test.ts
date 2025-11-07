describe('supabase-data-service revoke & access list', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('revokeProfileAccess resolves on success', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn().mockResolvedValue({
        from: () => ({
          delete: () => ({ eq: () => ({ eq: () => ({ error: null }) }) })
        })
      })
    }))

    const mod = await import('@/lib/supabase-data-service')
    await expect(mod.revokeProfileAccess('p1', 'x@x.com')).resolves.toBeUndefined()
  })

  it('revokeProfileAccess throws when db returns error', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn().mockResolvedValue({
        from: () => ({
          delete: () => ({ eq: () => ({ eq: () => ({ error: { message: 'db fail' } }) }) })
        })
      })
    }))

  const mod = await import('@/lib/supabase-data-service')
  await expect(mod.revokeProfileAccess('p1', 'x@x.com')).rejects.toMatchObject({ message: 'db fail' })
  })

  it('getProfileAccessList returns data on success', async () => {
    const data = [{ id: 'a', profile_id: 'p1', user_email: 'x@x.com', created_at: Date.now() }]
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn().mockResolvedValue({
        from: () => ({ select: () => ({ eq: () => ({ order: () => ({ data, error: null }) }) }) })
      })
    }))

    const mod = await import('@/lib/supabase-data-service')
    const res = await mod.getProfileAccessList('p1')
    expect(Array.isArray(res)).toBe(true)
    expect(res.length).toBe(1)
    expect(res[0].user_email).toBe('x@x.com')
  })
})
