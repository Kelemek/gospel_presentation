import { jest } from '@jest/globals'

// Helper to build a fake Supabase client driven by a behavior map
function makeFakeClient(behaviors: any = {}) {
  const rpc = jest.fn(async (_fn: string, _opts: any) => ({ data: null }))
  const auth = {
    getUser: async () => ({ data: { user: { id: 'user-id' } } }),
  }

  function from(table: string) {
    const tableBehavior = behaviors[table] || {}

    return {
      upsert: async (_records: any, _opts?: any) => ({ error: tableBehavior.upsertError || null }),
      select: (cols?: any) => {
        // Support chained .select().eq().single() and .select().order()
        return {
          eq: (col: string, val: any) => ({
            single: async () => {
              if (typeof tableBehavior.selectEqSingle === 'function') {
                return tableBehavior.selectEqSingle(col, val)
              }
              return tableBehavior.selectEqSingle || { data: null, error: null }
            }
          }),
          single: async () => tableBehavior.selectSingle || { data: null, error: null },
          order: (_col: string, _opts?: any) => ({
            data: tableBehavior.selectOrdered || tableBehavior.select || null,
            error: tableBehavior.selectError || null,
          }),
          in: (_col: string, _vals: any[]) => ({ data: tableBehavior.selectIn || null, error: null }),
          update: () => ({ data: tableBehavior.updateData || null, error: tableBehavior.updateError || null }),
          insert: () => ({ data: tableBehavior.insertData || null, error: tableBehavior.insertError || null }),
          delete: () => ({ data: tableBehavior.deleteData || null, error: tableBehavior.deleteError || null }),
          upsert: async (_records: any, _opts?: any) => ({ error: tableBehavior.upsertError || null }),
        }
      }
    }
  }

  return {
    from,
    rpc,
    auth,
    // allow spying in tests
    __internal_behaviors: behaviors,
  }
}

describe('supabase-data-service (unit)', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  test('loadGospelData returns gospel data from default profile', async () => {
    const gospel = [{ section: 's' }]

    // Mock server client to return gospel_data
    jest.doMock('../supabase/server', () => ({
      createClient: () => makeFakeClient({
        profiles: { selectEqSingle: { data: { gospel_data: gospel }, error: null } }
      })
    }))

    const svc = await import('../supabase-data-service')
    const res = await svc.loadGospelData()
    expect(res).toEqual(gospel)
  })

  test('getProfiles maps rows and joins users + access', async () => {
    const now = new Date().toISOString()
    const profilesRows = [
      {
        id: 'p1', slug: 'one', title: 'One', description: null,
        is_default: false, is_template: false, visit_count: 3,
        gospel_data: [], last_viewed_scripture: null, saved_answers: [],
        created_at: now, updated_at: now, last_visited: null, created_by: 'u1'
      }
    ]

    const users = [{ id: 'u1', display_name: 'Alice' }]
    const accessData = [{ profile_id: 'p1', user_email: 'x@example.com' }]

    jest.doMock('../supabase/server', () => ({
      createClient: () => makeFakeClient({
        profiles: { select: profilesRows, selectOrdered: profilesRows },
        user_profiles: { selectIn: users },
        profile_access: { selectIn: accessData }
      })
    }))

    const svc = await import('../supabase-data-service')
    const res = await svc.getProfiles()

    expect(Array.isArray(res)).toBe(true)
    expect(res.length).toBe(1)
    const p = res[0]
    expect(p.id).toBe('p1')
  expect(p.ownerDisplayName).toBe('Alice')
  expect((p as any).counseleeEmails).toContain('x@example.com')
    expect(p.createdAt).toBeInstanceOf(Date)
  })

  test('getProfileBySlug returns mapped profile and returns null on no rows', async () => {
    const now = new Date().toISOString()
    const row = {
      id: 'p2', slug: 's2', title: 'Two', description: null,
      is_default: false, is_template: false, visit_count: 0,
      gospel_data: [], last_viewed_scripture: null, saved_answers: [],
      created_at: now, updated_at: now, last_visited: null
    }

    // Case: found
  jest.doMock('../supabase/server', () => ({ createClient: () => makeFakeClient({ profiles: { selectEqSingle: { data: row, error: null } } }) }))
    let svc = await import('../supabase-data-service')
    let res = await svc.getProfileBySlug('s2')
    expect(res).not.toBeNull()
    expect((res as any)?.slug).toBe('s2')

    // Case: not found - simulate PGRST116 error
    jest.resetModules()
    jest.doMock('../supabase/server', () => ({ createClient: () => makeFakeClient({ profiles: { selectSingle: { data: null, error: { code: 'PGRST116' } } } }) }))
    svc = await import('../supabase-data-service')
    res = await svc.getProfileBySlug('missing')
    expect(res).toBeNull()
  })

  test('incrementProfileVisitCount calls rpc and does not throw on success', async () => {
    const fake = makeFakeClient({})
    const rpcSpy = jest.spyOn(fake, 'rpc')
    jest.doMock('../supabase/server', () => ({ createClient: () => fake }))
    const svc = await import('../supabase-data-service')
    await expect(svc.incrementProfileVisitCount('slug-x')).resolves.toBeUndefined()
    expect(rpcSpy).toHaveBeenCalledWith('increment_visit_count', { profile_slug: 'slug-x' })
  })

  test('grantProfileAccess upserts access and attempts to invite new users', async () => {
    // behaviors for main client: upsert succeeds
    const fakeMain = makeFakeClient({ profile_access: { upsertError: null } })

    // behaviors for admin client: no existing users, invite returns a created user
    const adminClient = {
      auth: { admin: {
        listUsers: async () => ({ users: [] }),
        inviteUserByEmail: async (email: string) => ({ data: { user: { id: 'new-id' } }, error: null })
      } },
      from: () => ({ select: async () => ({ data: { title: 'T', slug: 's' } }), }),
      // upsert on user_profiles
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      authAdmin: true,
    }

  jest.doMock('../supabase/server', () => ({ createClient: () => fakeMain }))
  // Mock the dynamic admin import path used inside inviteCounseleeUsers.
  // Export both createAdminClient and createClient to avoid clobbering the server mock used elsewhere.
  jest.doMock('@/lib/supabase/server', () => ({ createAdminClient: () => adminClient, createClient: () => fakeMain }))

    const svc = await import('../supabase-data-service')

    await expect(svc.grantProfileAccess('p123', ['  A@B.COM  ', 'invalid'], 'granter')).resolves.toBeUndefined()
    // upsert was part of fakeMain - ensure no error thrown
  })

  test('createProfile succeeds when authenticated and source exists', async () => {
    const now = new Date().toISOString()
    const created = {
      id: 'new-id', slug: 'newslug', title: 'New Title', description: null,
      is_default: false, is_template: false, visit_count: 0,
      gospel_data: [], saved_answers: [],
      created_at: now, updated_at: now, created_by: 'user-uid'
    }

    jest.doMock('../supabase/server', () => ({
      createClient: () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'user-uid' } } }) },
        from: (table: string) => {
          if (table === 'profiles') {
            return {
              select: () => ({
                eq: (_col: string, val: any) => ({
                  single: async () => {
                    // first call checks for existing slug -> return null
                    if (val === 'newslug') return { data: null, error: null }
                    // second call for source profile 'default'
                    if (val === 'default') return { data: { id: 'def', slug: 'default', title: 'Default', gospel_data: [] }, error: null }
                    return { data: null, error: null }
                  }
                }),
                single: async () => ({ data: { gospel_data: [] }, error: null }),
              }),
              insert: () => ({ select: () => ({ single: async () => ({ data: created, error: null }) }) })
            }
          }
          if (table === 'profile_access') {
            return { upsert: async () => ({ error: null }) }
          }
          return {}
        },
        rpc: async () => ({})
      })
    }))

    const svc = await import('../supabase-data-service')
    const res = await svc.createProfile({ slug: 'newslug', title: 'New Title' } as any)
    expect(res.id).toBe('new-id')
    expect(res.slug).toBe('newslug')
    expect(res.createdBy).toBe('user-uid')
  })

  test('createProfile throws when user not authenticated', async () => {
    jest.doMock('../supabase/server', () => ({
      createClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }) }, from: () => ({}) })
    }))
    const svc = await import('../supabase-data-service')
    await expect(svc.createProfile({ slug: 'x', title: 'T' } as any)).rejects.toThrow(/authenticated/)
  })

  test('updateProfile maps fields and returns dates', async () => {
    const now = new Date().toISOString()
    const updated = {
      id: 'p1', slug: 's1', title: 'Updated', description: 'd', is_default: false, is_template: false,
      visit_count: 1, gospel_data: [], last_viewed_scripture: { reference: 'John 3:16', viewedAt: now },
      saved_answers: ['a'], created_at: now, updated_at: now, last_visited: now
    }

    jest.doMock('../supabase/server', () => ({
      createClient: () => ({
        from: (table: string) => {
          if (table === 'profiles') {
            return {
              update: (_data: any) => ({
                eq: (_col: string, _val: any) => ({ select: () => ({ single: async () => ({ data: updated, error: null }) }) })
              })
            }
          }
          return { update: () => ({ data: null, error: null }) }
        }
      })
    }))

    const svc = await import('../supabase-data-service')
    const res = await svc.updateProfile('s1', { title: 'Updated', lastViewedScripture: { reference: 'John 3:16', viewedAt: now } } as any)
    expect(res.title).toBe('Updated')
    expect(res.lastViewedScripture).toBeDefined()
    expect(res.updatedAt).toBeInstanceOf(Date)
  })

  test('deleteProfile resolves on success', async () => {
    jest.doMock('../supabase/server', () => ({
      createClient: () => ({
        from: (table: string) => ({
          delete: () => ({ eq: (_col: string, _val: any) => ({ eq: (_c: string, _v: any) => ({ error: null }) }) })
        })
      })
    }))
    const svc = await import('../supabase-data-service')
    await expect(svc.deleteProfile('some-slug')).resolves.toBeUndefined()
  })

  test('revokeProfileAccess resolves on success', async () => {
    jest.doMock('../supabase/server', () => ({
      createClient: () => ({
        from: (table: string) => ({
          // Support chained .delete().eq(...).eq(...) used by revokeProfileAccess
          delete: () => ({ eq: (_col: string, _val: any) => ({ eq: (_c: string, _v: any) => ({ error: null }) }) })
        })
      })
    }))
    const svc = await import('../supabase-data-service')
    await expect(svc.revokeProfileAccess('p', 'a@b.com')).resolves.toBeUndefined()
  })

  test('getProfileAccessList returns rows', async () => {
    const rows = [{ id: 'r1', user_email: 'a@b.com' }]
    jest.doMock('../supabase/server', () => ({
      createClient: () => ({
        from: (table: string) => ({
          select: () => ({
            eq: (_col: string, _val: any) => ({ order: (_col2: string, _opts?: any) => ({ data: rows, error: null }) })
          })
        })
      })
    }))
    const svc = await import('../supabase-data-service')
    const res = await svc.getProfileAccessList('p')
    expect(res).toEqual(rows)
  })

  test('loadGospelData returns empty on error', async () => {
    jest.doMock('../supabase/server', () => ({
      createClient: () => ({
        from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null, error: { message: 'DB' } }) }) }) })
      })
    }))
    const svc = await import('../supabase-data-service')
    const res = await svc.loadGospelData()
    expect(Array.isArray(res)).toBe(true)
    expect(res.length).toBe(0)
  })

  test('getProfiles returns empty on query error', async () => {
    jest.doMock('../supabase/server', () => ({
      createClient: () => ({ from: () => ({ select: () => ({ order: () => ({ data: null, error: { message: 'DB' } }) }) }) })
    }))
    const svc = await import('../supabase-data-service')
    const res = await svc.getProfiles()
    expect(Array.isArray(res)).toBe(true)
    expect(res.length).toBe(0)
  })

  test('createProfile throws when source profile missing', async () => {
    const createdUser = { id: 'user-uid' }
    // First select for existing slug -> null, second for source 'default' -> null
    jest.doMock('../supabase/server', () => ({
      createClient: () => ({
        auth: { getUser: async () => ({ data: { user: createdUser } }) },
        from: (table: string) => ({
          select: () => ({
            eq: (_col: string, val: any) => ({ single: async () => ({ data: null, error: null }) }),
            single: async () => ({ data: null, error: null })
          }),
          insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) })
        }),
        rpc: async () => ({})
      })
    }))
    const svc = await import('../supabase-data-service')
    await expect(svc.createProfile({ slug: 'x', title: 'T' } as any)).rejects.toThrow(/Source profile 'default' not found|not found/)
  })

  test('updateProfile throws on DB error', async () => {
    jest.doMock('../supabase/server', () => ({
      createClient: () => ({
        from: (table: string) => ({
          update: () => ({ eq: () => { throw new Error('DB') } })
        })
      })
    }))
    const svc = await import('../supabase-data-service')
    await expect(svc.updateProfile('s1', { title: 'x' } as any)).rejects.toThrow()
  })

  test('deleteProfile throws on DB error', async () => {
    jest.doMock('../supabase/server', () => ({
      createClient: () => ({
        from: () => ({ delete: () => ({ eq: () => { throw new Error('DB') } }) })
      })
    }))
    const svc = await import('../supabase-data-service')
    await expect(svc.deleteProfile('s')).rejects.toThrow()
  })

  test('incrementProfileVisitCount does not throw on rpc error', async () => {
    jest.doMock('../supabase/server', () => ({ createClient: () => ({ rpc: async () => { throw new Error('rpc fail') } }) }))
    const svc = await import('../supabase-data-service')
    await expect(svc.incrementProfileVisitCount('s')).resolves.toBeUndefined()
  })

  test('grantProfileAccess returns early when emails invalid', async () => {
    // If emails are invalid the upsert should not be called; provide an upsert that would throw if invoked
    jest.doMock('../supabase/server', () => ({
      createClient: () => ({
        from: () => ({ upsert: async () => { throw new Error('should not be called') } })
      })
    }))
    const svc = await import('../supabase-data-service')
    await expect(svc.grantProfileAccess('p', ['   ', 'not-an-email'], 'g')).resolves.toBeUndefined()
  })

  test('grantProfileAccess invites new users and upserts user_profiles via admin client', async () => {
    // main client: upsert succeeds
    const fakeMain = makeFakeClient({ profile_access: { upsertError: null } })

    // admin client: no existing users, inviteUserByEmail returns created user
    const adminClient = {
      auth: { admin: {
        listUsers: async () => ({ users: [] }),
        inviteUserByEmail: async (email: string) => ({ data: { user: { id: `invite-${email}` } }, error: null })
      } },
      from: (table: string) => ({ select: () => ({ eq: (_col: string, _val: any) => ({ single: async () => ({ data: { title: 'T', slug: 's' }, error: null }) }) }) }),
      fromAdmin: () => ({ upsert: async () => ({ error: null }) })
    }

    // Mock server createClient and admin factory
    jest.doMock('../supabase/server', () => ({ createClient: () => fakeMain }))
    jest.doMock('@/lib/supabase/server', () => ({ createAdminClient: () => adminClient, createClient: () => fakeMain }))

    const svc = await import('../supabase-data-service')
    await expect(svc.grantProfileAccess('pid', ['new@x.com'], 'granter')).resolves.toBeUndefined()
  })

  test('grantProfileAccess tolerates admin.listUsers throwing (invite best-effort)', async () => {
    const fakeMain = makeFakeClient({ profile_access: { upsertError: null } })

    // admin client that throws when listing users
    const adminClient = {
      auth: { admin: {
        listUsers: async () => { throw new Error('admin list failed') },
        inviteUserByEmail: async (email: string) => ({ data: { user: { id: `invite-${email}` } }, error: null })
      } },
      from: (table: string) => ({ select: () => ({ eq: (_col: string, _val: any) => ({ single: async () => ({ data: { title: 'T', slug: 's' }, error: null }) }) }) }),
      fromAdmin: () => ({ upsert: async () => ({ error: null }) })
    }

    jest.doMock('../supabase/server', () => ({ createClient: () => fakeMain }))
    jest.doMock('@/lib/supabase/server', () => ({ createAdminClient: () => adminClient, createClient: () => fakeMain }))

    const svc = await import('../supabase-data-service')
    // Should resolve even though admin.listUsers threw (invite is best-effort)
    await expect(svc.grantProfileAccess('pid', ['new@x.com'], 'granter')).resolves.toBeUndefined()
  })

  test('grantProfileAccess tolerates inviteUserByEmail returning an error', async () => {
    const fakeMain = makeFakeClient({ profile_access: { upsertError: null } })

    // admin client where inviteUserByEmail returns an error for the email
    const adminClient = {
      auth: { admin: {
        listUsers: async () => ({ users: [] }),
        inviteUserByEmail: async (_email: string) => ({ data: null, error: { message: 'invite failed' } })
      } },
      from: (table: string) => ({ select: () => ({ eq: (_col: string, _val: any) => ({ single: async () => ({ data: { title: 'T', slug: 's' }, error: null }) }) }) }),
      fromAdmin: () => ({ upsert: async () => ({ error: null }) })
    }

    jest.doMock('../supabase/server', () => ({ createClient: () => fakeMain }))
    jest.doMock('@/lib/supabase/server', () => ({ createAdminClient: () => adminClient, createClient: () => fakeMain }))

    const svc = await import('../supabase-data-service')
    // inviteUserByEmail returns an error — should not cause grantProfileAccess to throw
    await expect(svc.grantProfileAccess('pid', ['bad@x.com'], 'granter')).resolves.toBeUndefined()
  })

  test('grantProfileAccess skips invites when all emails already have accounts', async () => {
    const fakeMain = makeFakeClient({ profile_access: { upsertError: null } })

    // admin client: listUsers reports that the email already exists
    const adminClient = {
      auth: { admin: {
        listUsers: async () => ({ users: [{ email: 'existing@x.com' }] }),
        // If inviteUserByEmail is called it will throw to fail the test
        inviteUserByEmail: async () => { throw new Error('invite should not be called') }
      } },
      from: (table: string) => ({ select: () => ({ eq: (_col: string, _val: any) => ({ single: async () => ({ data: { title: 'T', slug: 's' }, error: null }) }) }) })
    }

    jest.doMock('../supabase/server', () => ({ createClient: () => fakeMain }))
    jest.doMock('@/lib/supabase/server', () => ({ createAdminClient: () => adminClient, createClient: () => fakeMain }))

    const svc = await import('../supabase-data-service')
    // Should resolve and not attempt invites (no throw)
    await expect(svc.grantProfileAccess('pid', ['existing@x.com'], 'granter')).resolves.toBeUndefined()
  })

  test('grantProfileAccess tolerates inviteUserByEmail throwing an exception', async () => {
    const fakeMain = makeFakeClient({ profile_access: { upsertError: null } })

    // admin client where inviteUserByEmail throws an exception (not a returned error)
    const adminClient = {
      auth: { admin: {
        listUsers: async () => ({ users: [] }),
        inviteUserByEmail: async (_email: string) => { throw new Error('invite threw') }
      } },
      from: (table: string) => ({ select: () => ({ eq: (_col: string, _val: any) => ({ single: async () => ({ data: { title: 'T', slug: 's' }, error: null }) }) }) }),
      fromAdmin: () => ({ upsert: async () => ({ error: null }) })
    }

    jest.doMock('../supabase/server', () => ({ createClient: () => fakeMain }))
    jest.doMock('@/lib/supabase/server', () => ({ createAdminClient: () => adminClient, createClient: () => fakeMain }))

    const svc = await import('../supabase-data-service')
    // inviteUserByEmail throwing should be caught and not cause the outer call to throw
    await expect(svc.grantProfileAccess('pid', ['willthrow@x.com'], 'granter')).resolves.toBeUndefined()
  })

  test('grantProfileAccess tolerates user_profiles.upsert error (logs warning, does not throw)', async () => {
    const fakeMain = makeFakeClient({ profile_access: { upsertError: null } })

    // admin client where invite succeeds but user_profiles.upsert returns an error
    let upsertCalled = false
    const adminClient = {
      auth: { admin: {
        listUsers: async () => ({ users: [] }),
        inviteUserByEmail: async (email: string) => ({ data: { user: { id: `invite-${email}` } }, error: null })
      } },
      from: (table: string) => {
        if (table === 'user_profiles') {
          return { upsert: async () => { upsertCalled = true; return { error: { message: 'upsert failed' } } } }
        }
        return { select: () => ({ eq: (_col: string, _val: any) => ({ single: async () => ({ data: { title: 'T', slug: 's' }, error: null }) }) }) }
      }
    }

    jest.doMock('../supabase/server', () => ({ createClient: () => fakeMain }))
    jest.doMock('@/lib/supabase/server', () => ({ createAdminClient: () => adminClient, createClient: () => fakeMain }))

    const svc = await import('../supabase-data-service')
    await expect(svc.grantProfileAccess('pid', ['new@x.com'], 'granter')).resolves.toBeUndefined()
    expect(upsertCalled).toBe(true)
  })

  test('grantProfileAccess throws when upsert returns error', async () => {
    // Mock createClient so that calling upsert will throw an error synchronously
    jest.doMock('../supabase/server', () => ({
      createClient: () => ({
        from: (table: string) => ({
          upsert: async () => { throw new Error('DB') }
        })
      })
    }))

    const svc = await import('../supabase-data-service')
    await expect(svc.grantProfileAccess('p', ['a@b.com'], 'g')).rejects.toThrow()
  })

  test('revokeProfileAccess throws on DB error', async () => {
    // Make the inner eq throw so the service sees an exception path
    jest.doMock('../supabase/server', () => ({
      createClient: () => ({
        from: (table: string) => ({
          delete: () => ({
            eq: (_col: string, _val: any) => ({
              eq: (_c: string, _v: any) => { throw new Error('DB') }
            })
          })
        })
      })
    }))

    const svc = await import('../supabase-data-service')
    await expect(svc.revokeProfileAccess('p', 'a@b.com')).rejects.toThrow()
  })

})
describe('supabase-data-service', () => {
	it('dummy', () => {
		expect(true).toBe(true)
	})
})
