import { GET, POST } from '../profiles/route'
import { NextRequest } from 'next/server'
import * as dataService from '@/lib/supabase-data-service'

jest.mock('@/lib/supabase-data-service')
jest.mock('@/lib/supabase/server')
const mockDataService = dataService as jest.Mocked<typeof dataService>

describe('/api/profiles', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    const { createClient: mockCreateClient, createAdminClient: mockCreateAdminClient } = require('@/lib/supabase/server')
    mockCreateClient.mockResolvedValue({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          in: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    })
    mockCreateAdminClient.mockReturnValue({
      auth: { admin: { listUsers: jest.fn().mockResolvedValue({ data: { users: [] }, error: null }) } }
    })
  })

  describe('GET', () => {
    it('returns profiles list on success', async () => {
      mockDataService.getProfiles.mockResolvedValue([
        { id: 'p1', slug: 's1', title: 'T1', description: '', isDefault: false, isTemplate: false, visitCount: 0, lastVisited: null, createdAt: new Date(), updatedAt: new Date(), createdBy: 'u1', ownerDisplayName: 'Owner', } as any
      ])

      const res = await GET()
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(Array.isArray(body.profiles)).toBe(true)
      expect(body.profiles[0].slug).toBe('s1')
    })

    it('fetches owner usernames when profiles have createdBy', async () => {
      const { createClient: mockCreateClient } = require('@/lib/supabase/server')
      mockCreateClient.mockResolvedValue({
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            in: jest.fn(() => Promise.resolve({
              data: [{ id: 'u1', username: 'owner1' }],
              error: null
            }))
          }))
        }))
      })
      mockDataService.getProfiles.mockResolvedValue([
        { id: 'p1', slug: 's1', title: 'T1', description: '', isDefault: false, isTemplate: false, visitCount: 0, lastVisited: null, createdAt: new Date(), updatedAt: new Date(), createdBy: 'u1', ownerDisplayName: 'Owner' } as any
      ])

      const res = await GET()
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.profiles[0].ownerUsername).toBe('owner1')
    })

    it('fetches counselee usernames via admin listUsers and user_profiles', async () => {
      const { createClient: mockCreateClient, createAdminClient: mockCreateAdminClient } = require('@/lib/supabase/server')
      mockCreateClient.mockResolvedValue({
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            in: jest.fn(() => Promise.resolve({
              data: [{ id: 'c1', username: 'counselee1' }],
              error: null
            }))
          }))
        }))
      })
      mockCreateAdminClient.mockReturnValue({
        auth: { admin: { listUsers: jest.fn().mockResolvedValue({ data: { users: [{ id: 'c1', email: 'c@x.com' }] }, error: null }) } }
      })
      mockDataService.getProfiles.mockResolvedValue([
        { id: 'p2', slug: 's2', title: 'T2', description: '', isDefault: false, isTemplate: false, visitCount: 0, lastVisited: null, createdAt: new Date(), updatedAt: new Date(), createdBy: null, ownerDisplayName: '', counseleeEmails: ['c@x.com'] } as any
      ])

      const res = await GET()
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.profiles[0].usernames).toContain('counselee1')
    })

    it('handles authError in counselee path and still returns profiles', async () => {
      const { createAdminClient: mockCreateAdminClient } = require('@/lib/supabase/server')
      mockCreateAdminClient.mockReturnValue({
        auth: { admin: { listUsers: jest.fn().mockResolvedValue({ data: null, error: { message: 'Auth error' } }) } }
      })
      mockDataService.getProfiles.mockResolvedValue([
        { id: 'p2', slug: 's2', title: 'T2', description: '', isDefault: false, isTemplate: false, visitCount: 0, lastVisited: null, createdAt: new Date(), updatedAt: new Date(), createdBy: null, ownerDisplayName: '', counseleeEmails: ['c@x.com'] } as any
      ])

      const res = await GET()
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.profiles).toHaveLength(1)
    })

    it('handles errors from data service', async () => {
      mockDataService.getProfiles.mockRejectedValue(new Error('DB'))

      const res = await GET()
      const body = await res.json()

      expect(res.status).toBe(500)
      expect(body.error).toBeDefined()
    })
  })

  describe('POST', () => {
    it('returns 400 when title missing', async () => {
      const req = new NextRequest('http://localhost/api/profiles', { method: 'POST' as any })
      // NextRequest doesn't accept a body in constructor easily in this test env; supply an empty body via a mocked json() on the request object
      // but the route uses request.json(), so we can pass a Request-like object. Simpler: call POST with a plain object that has json() method.
      const reqLike: any = { json: async () => ({}) }
      const res = await POST(reqLike as Request)
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toMatch(/Missing required field/)
    })

    it('creates a profile and returns it', async () => {
      const created = { id: 'np', slug: 'np', title: 'New', description: '', isDefault: false, visitCount: 0, createdAt: new Date(), updatedAt: new Date() } as any
      mockDataService.createProfile.mockResolvedValue(created)

      const payload = { title: 'New', description: 'd' }
      const reqLike: any = { json: async () => payload }
      const res = await POST(reqLike as Request)
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.profile).toBeDefined()
      expect(body.profile.slug).toBe('np')
      expect(mockDataService.createProfile).toHaveBeenCalledWith(payload)
    })

    it('returns 500 when createProfile throws', async () => {
      mockDataService.createProfile.mockRejectedValue(new Error('DB failure'))
      const reqLike: any = { json: async () => ({ title: 'New' }) }
      const res = await POST(reqLike as Request)
      const body = await res.json()
      expect(res.status).toBe(500)
      expect(body.error).toBeDefined()
    })
  })
})
