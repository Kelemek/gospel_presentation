describe('supabase-data-service load/getProfile edge cases', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('loadGospelData returns gospel data when default profile present', async () => {
    const mockGospel = [{ id: 'g1', name: 'G' }]

    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn().mockResolvedValue({
        from: (table: string) => ({
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { gospel_data: mockGospel }, error: null })
            })
          })
        })
      })
    }))

    const mod = await import('@/lib/supabase-data-service')
    const res = await mod.loadGospelData()
    expect(Array.isArray(res)).toBe(true)
    expect(res.length).toBe(1)
  })

  it('loadGospelData returns empty array on error', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn().mockResolvedValue({
        from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null, error: { message: 'fail' } }) }) }) })
      })
    }))

    const mod = await import('@/lib/supabase-data-service')
    const res = await mod.loadGospelData()
    expect(Array.isArray(res)).toBe(true)
    expect(res.length).toBe(0)
  })

  it('getProfileBySlug returns null for PGRST116 (no rows)', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn().mockResolvedValue({
        from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null, error: { code: 'PGRST116' } }) }) }) })
      })
    }))

    const mod = await import('@/lib/supabase-data-service')
    const res = await mod.getProfileBySlug('missing')
    expect(res).toBeNull()
  })

  it('getProfileBySlug maps returned row to profile object', async () => {
    const row = { id: 'p1', slug: 's', title: 'T', is_default: false, is_template: false, visit_count: 0, gospel_data: [], created_at: Date.now(), updated_at: Date.now() }

    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn().mockResolvedValue({
        from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: row, error: null }) }) }) })
      })
    }))

    const mod = await import('@/lib/supabase-data-service')
    const res = await mod.getProfileBySlug('s')
    expect(res).not.toBeNull()
    expect(res?.slug).toBe('s')
  })
})
