jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn(), createAdminClient: jest.fn() }))

import * as server from '@/lib/supabase/server'
import { createProfile } from '@/lib/supabase-data-service'

describe('createProfile', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('creates a profile when source exists and user authenticated', async () => {
    const sourceProfile = {
      id: 'src1',
      slug: 'default',
      title: 'Default',
      gospel_data: [{ section: 's' }]
    }

    const created = {
      id: 'new1',
      slug: 'new-slug',
      title: 'New Title',
      description: null,
      is_default: false,
      is_template: false,
      visit_count: 0,
      gospel_data: sourceProfile.gospel_data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'u1'
    }

    // First call: createClient for auth.getUser and later insert in createProfile
    ;(server.createClient as jest.Mock).mockResolvedValueOnce({
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
      from: (table: string) => ({
        insert: () => ({ select: () => ({ single: async () => ({ data: created, error: null }) }) })
      })
    })

    // Second call: createClient used by getProfileBySlug(existing check) -> return null (no existing)
    ;(server.createClient as jest.Mock).mockResolvedValueOnce({
      from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ error: { code: 'PGRST116' } }) }) }) })
    })

    // Third call: createClient used by getProfileBySlug(sourceSlug) -> return sourceProfile
    ;(server.createClient as jest.Mock).mockResolvedValueOnce({
      from: (table: string) => ({
        select: () => ({
          eq: () => ({ single: async () => ({ data: sourceProfile, error: null }) })
        })
      })
    })

    const result = await createProfile({ title: 'New Title', cloneFromSlug: 'default', counseleeEmails: [] })

    expect(result.slug).toBe(created.slug)
    expect(result.createdBy).toBe(created.created_by)
  })

  it('throws when slug already exists', async () => {
    // First createClient for auth.getUser (and insert stub, though not used because it will throw earlier)
    ;(server.createClient as jest.Mock).mockResolvedValueOnce({
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
      from: () => ({ insert: () => ({ select: () => ({ single: async () => ({ data: {}, error: null }) }) }) })
    })

    // existing profile check: return an existing profile
    ;(server.createClient as jest.Mock).mockResolvedValueOnce({
      from: (table: string) => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'exists', slug: 'exists' }, error: null }) }) })
      })
    })

    await expect(createProfile({ title: 'X', slug: 'exists' })).rejects.toThrow(/already exists/)
  })
})
