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
      }),
      createAdminClient: jest.fn().mockReturnValue({
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
      }),
      createAdminClient: jest.fn().mockReturnValue({
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
      }),
      createAdminClient: jest.fn().mockReturnValue({
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
        auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
        from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: row, error: null }) }) }) })
      }),
      createAdminClient: jest.fn().mockReturnValue({
        auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
        from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: row, error: null }) }) }) })
      })
    }))

    const mod = await import('@/lib/supabase-data-service')
    const res = await mod.getProfileBySlug('s')
    expect(res).not.toBeNull()
    expect(res?.slug).toBe('s')
  })

  it('getPublicResourcesStructure returns template items when order empty', async () => {
    const rows = [
      { slug: 't1', title: 'Template One' },
      { slug: 't2', title: 'Template Two' }
    ]
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn().mockResolvedValue({
        from: (table: string) => {
          if (table === 'profiles') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    not: () => ({
                      not: () => ({
                        not: () => ({
                          not: async () => Promise.resolve({ data: rows, error: null }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }
          }
          if (table === 'admin_settings') {
            return {
              select: () => ({
                eq: () => ({
                  single: () => Promise.resolve({ data: { public_template_order: [] }, error: null })
                })
              })
            }
          return {}
        }
      }
      }),
      createAdminClient: jest.fn().mockReturnValue({})
    }))

    const mod = await import('@/lib/supabase-data-service')
    const res = await mod.getPublicResourcesStructure()
    expect(Array.isArray(res)).toBe(true)
    expect(res).toHaveLength(2)
    expect(res[0]).toEqual({ type: 'template', slug: 't1', title: 'Template One' })
    expect(res[1]).toEqual({ type: 'template', slug: 't2', title: 'Template Two' })
  })

  it('getPublicResourcesStructure includes ordered lgal when bulk query omits it', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn().mockResolvedValue({
        from: (table: string) => {
          if (table === 'profiles') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    not: () => ({
                      not: () => ({
                        not: () => ({
                          not: async () => ({
                            data: [
                              {
                                slug: 'default',
                                title: 'Default',
                                include_in_resources_menu: true,
                              },
                            ],
                            error: null,
                          }),
                        }),
                      }),
                    }),
                    in: async () => ({
                      data: [
                        {
                          slug: 'lgal',
                          title: 'Commentary on Galatians (Martin Luther)',
                          include_in_resources_menu: true,
                        },
                      ],
                      error: null,
                    }),
                  }),
                }),
              }),
            }
          }
          if (table === 'admin_settings') {
            return {
              select: () => ({
                eq: () => ({
                  single: () =>
                    Promise.resolve({
                      data: {
                        public_template_order: [
                          { type: 'template', slug: 'default' },
                          { type: 'template', slug: 'lgal' },
                        ],
                      },
                      error: null,
                    }),
                }),
              }),
            }
          }
          return {}
        },
      }),
      createAdminClient: jest.fn().mockReturnValue({}),
    }))

    const mod = await import('@/lib/supabase-data-service')
    const res = await mod.getPublicResourcesStructure()
    expect(res.map((i) => (i.type === 'template' ? i.slug : null)).filter(Boolean)).toEqual([
      'default',
      'lgal',
    ])
  })

  it('getPublicResourcesStructure returns empty array when profiles error', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn().mockResolvedValue({
        from: (table: string) => {
          if (table === 'profiles') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    not: () => ({
                      not: () => ({
                        not: () => ({
                          not: async () => Promise.resolve({ data: null, error: { message: 'fail' } }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }
          }
          if (table === 'admin_settings') {
            return {
              select: () => ({
                eq: () => ({
                  single: () => Promise.resolve({ data: { public_template_order: [] }, error: null })
                })
              })
            }
          return {}
        }
      }
      }),
      createAdminClient: jest.fn().mockReturnValue({})
    }))

    const mod = await import('@/lib/supabase-data-service')
    const res = await mod.getPublicResourcesStructure()
    expect(res).toEqual([])
  })

  it('getProfileMeta returns title, description, updatedAt', async () => {
    const row = { title: 'My Profile', description: 'A profile', updated_at: '2026-03-01T12:00:00Z' }
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn().mockResolvedValue({
        auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
        from: () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({ data: row, error: null })
            })
          })
        })
      }),
      createAdminClient: jest.fn().mockReturnValue({
        from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: row, error: null }) }) }) })
      })
    }))

    const mod = await import('@/lib/supabase-data-service')
    const res = await mod.getProfileMeta('my-profile')
    expect(res).not.toBeNull()
    expect(res?.title).toBe('My Profile')
    expect(res?.description).toBe('A profile')
    expect(res?.updatedAt).toBeInstanceOf(Date)
    expect((res as any).updatedAt.toISOString()).toBe('2026-03-01T12:00:00.000Z')
  })

  it('getProfileMeta returns null when profile not found', async () => {
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn().mockResolvedValue({
        auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
        from: () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({ data: null, error: { code: 'PGRST116' } })
            })
          })
        })
      }),
      createAdminClient: jest.fn().mockReturnValue({})
    }))

    const mod = await import('@/lib/supabase-data-service')
    const res = await mod.getProfileMeta('missing')
    expect(res).toBeNull()
  })

  it('getProfileUpdatedAt returns Date when profile exists', async () => {
    const row = { title: 'X', description: null, updated_at: '2026-03-01T12:00:00Z' }
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: jest.fn().mockResolvedValue({
        auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
        from: () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({ data: row, error: null })
            })
          })
        })
      }),
      createAdminClient: jest.fn().mockReturnValue({})
    }))

    const mod = await import('@/lib/supabase-data-service')
    const res = await mod.getProfileUpdatedAt('x')
    expect(res).toBeInstanceOf(Date)
    expect((res as Date).toISOString()).toBe('2026-03-01T12:00:00.000Z')
  })
})
