import { GET, POST, DELETE } from '../route'
import { createClient } from '@/lib/supabase/server'
import * as dataService from '@/lib/supabase-data-service'

jest.mock('@/lib/supabase/server')
jest.mock('@/lib/supabase-data-service')

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockDataService = dataService as jest.Mocked<typeof dataService>

describe('/api/profiles/[slug]/access', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('GET returns 401 when unauthenticated', async () => {
    // createClient returns a supabase client whose auth.getUser returns no user
    mockCreateClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
      from: jest.fn()
    } as any)

    const res = await GET({} as any, { params: Promise.resolve({ slug: 's1' }) })
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toMatch(/Unauthorized/i)
  })

  it('GET returns 403 when user is not owner or admin', async () => {
    const user = { id: 'u1' }
    const profile = { id: 'p1', created_by: 'other' }
    const userProfile = { role: 'member' }

    mockCreateClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
      from: (table: string) => {
        if (table === 'profiles') {
          return { select: () => ({ eq: () => ({ single: async () => ({ data: profile, error: null }) }) }) } as any
        }
        if (table === 'user_profiles') {
          return { select: () => ({ eq: () => ({ single: async () => ({ data: userProfile, error: null }) }) }) } as any
        }
        return { select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) } as any
      }
    } as any)

    const res = await GET({} as any, { params: Promise.resolve({ slug: 's1' }) })
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toMatch(/Forbidden/i)
  })

  it('GET returns access list for owner', async () => {
    const user = { id: 'owner' }
    const profile = { id: 'p-owner', created_by: 'owner' }
    const userProfile = { role: 'member' }
    const accessList = [{ email: 'a@b.com' }, { email: 'c@d.com' }]

    mockCreateClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
      from: (table: string) => {
        if (table === 'profiles') {
          return { select: () => ({ eq: () => ({ single: async () => ({ data: profile, error: null }) }) }) } as any
        }
        if (table === 'user_profiles') {
          return { select: () => ({ eq: () => ({ single: async () => ({ data: userProfile, error: null }) }) }) } as any
        }
        return { select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) } as any
      }
    } as any)

    mockDataService.getProfileAccessList.mockResolvedValue(accessList as any)

    const res = await GET({} as any, { params: Promise.resolve({ slug: 'owner' }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.access).toEqual(accessList)
    expect(mockDataService.getProfileAccessList).toHaveBeenCalledWith(profile.id)
  })

  it('POST returns 400 for invalid email', async () => {
    mockCreateClient.mockResolvedValue({ auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u' } } }) }, from: jest.fn() } as any)

    const req = ({ json: async () => ({ email: 'not-an-email' }) } as unknown) as any
    const res = await POST(req, { params: Promise.resolve({ slug: 's1' }) })
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toMatch(/Invalid email format|Valid email is required/i)
  })

  it('POST grants access on success', async () => {
    const user = { id: 'owner' }
    const profile = { id: 'p1', created_by: 'owner' }
    const userProfile = { role: 'member' }

    mockCreateClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
      from: (table: string) => {
        if (table === 'profiles') {
          return { select: () => ({ eq: () => ({ single: async () => ({ data: profile, error: null }) }) }) } as any
        }
        if (table === 'user_profiles') {
          return { select: () => ({ eq: () => ({ single: async () => ({ data: userProfile, error: null }) }) }) } as any
        }
        return { select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) } as any
      }
    } as any)

    mockDataService.grantProfileAccess.mockResolvedValue(undefined as any)

    const req = ({ json: async () => ({ email: 'New@Example.com' }) } as unknown) as any
    const res = await POST(req, { params: Promise.resolve({ slug: 's1' }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.email).toBe('new@example.com')
    expect(mockDataService.grantProfileAccess).toHaveBeenCalledWith(profile.id, ['new@example.com'], user.id)
  })

  it('DELETE revokes access on success', async () => {
    const user = { id: 'owner' }
    const profile = { id: 'p1', created_by: 'owner' }
    const userProfile = { role: 'member' }

    mockCreateClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
      from: (table: string) => {
        if (table === 'profiles') {
          return { select: () => ({ eq: () => ({ single: async () => ({ data: profile, error: null }) }) }) } as any
        }
        if (table === 'user_profiles') {
          return { select: () => ({ eq: () => ({ single: async () => ({ data: userProfile, error: null }) }) }) } as any
        }
        return { select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) } as any
      }
    } as any)

    mockDataService.revokeProfileAccess.mockResolvedValue(undefined as any)

    const req = ({ json: async () => ({ email: 'a@b.com' }) } as unknown) as any
    const res = await DELETE(req, { params: Promise.resolve({ slug: 's1' }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.email).toBe('a@b.com')
    expect(mockDataService.revokeProfileAccess).toHaveBeenCalledWith(profile.id, 'a@b.com')
  })
})
