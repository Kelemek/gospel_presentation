jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn()
}))

import * as server from '@/lib/supabase/server'
import { getProfiles, updateProfile, deleteProfile, incrementProfileVisitCount } from '@/lib/supabase-data-service'

describe('supabase-data-service additional branches', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('getProfiles maps users, access and dates correctly', async () => {
    const profiles = [{ id: 'p1', slug: 'a', title: 'A', created_by: 'u1', is_default: false, is_template: false, visit_count: 2, gospel_data: [], created_at: Date.now(), updated_at: Date.now() }]
    const users = [{ id: 'u1', display_name: 'User One' }]
    const accessData = [{ profile_id: 'p1', user_email: 'x@x.com' }]

    ;(server.createClient as jest.Mock).mockResolvedValueOnce({
      from: (table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({ order: () => ({ data: profiles, error: null }) })
          }
        }
        if (table === 'user_profiles') {
          return {
            select: () => ({ in: () => ({ data: users, error: null }) })
          }
        }
        if (table === 'profile_access') {
          return {
            select: () => ({ in: () => ({ data: accessData, error: null }) })
          }
        }
        return { select: () => ({ data: null, error: null }) }
      }
    })

    const res = await getProfiles()
    expect(Array.isArray(res)).toBe(true)
    expect(res[0].ownerDisplayName).toBe('User One')
    expect(res[0].counseleeEmails).toContain('x@x.com')
  })

  it('updateProfile returns mapped profile', async () => {
    const updated = { id: 'p1', slug: 'a', title: 'New', is_default: false, is_template: false, visit_count: 0, gospel_data: [], created_at: Date.now(), updated_at: Date.now() }

    ;(server.createClient as jest.Mock).mockResolvedValueOnce({
      from: () => ({ update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: updated, error: null }) }) }) }) })
    })

    const res = await updateProfile('a', { title: 'New' })
    expect(res.title).toBe('New')
    expect(res.slug).toBe('a')
  })

  it('deleteProfile throws on db error', async () => {
    ;(server.createClient as jest.Mock).mockResolvedValueOnce({
      from: () => ({ delete: () => ({ eq: () => ({ error: { message: 'fail' } }) }) })
    })

    // Import the module after setting the mock so the createClient mockResolvedValueOnce is applied
    const mod = await import('@/lib/supabase-data-service')
    await expect(mod.deleteProfile('a')).rejects.toThrow()
  })

  it('incrementProfileVisitCount swallows errors', async () => {
    const rpc = jest.fn(async () => { throw new Error('rpc fail') })
    ;(server.createClient as jest.Mock).mockResolvedValueOnce({ rpc })

    // should not throw
    await expect(incrementProfileVisitCount('a')).resolves.toBeUndefined()
  })
})
