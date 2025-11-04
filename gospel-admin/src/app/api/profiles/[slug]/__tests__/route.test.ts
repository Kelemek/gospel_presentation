import { GET, PUT, DELETE } from '../../[slug]/route'
import { NextRequest } from 'next/server'
import * as dataService from '@/lib/supabase-data-service'
import * as profileService from '@/lib/profile-service'

jest.mock('@/lib/supabase-data-service')
jest.mock('@/lib/profile-service')

const mockDataService = dataService as jest.Mocked<typeof dataService>
const mockProfileService = profileService as jest.Mocked<typeof profileService>

describe('/api/profiles/[slug]', () => {
  beforeEach(() => jest.resetAllMocks())

  describe('GET', () => {
    it('returns sanitized profile for public requests', async () => {
      const profile = { id: 'p1', slug: 's1', title: 'T1' } as any
      mockDataService.getProfileBySlug.mockResolvedValue(profile)
      mockProfileService.sanitizeProfileForPublic.mockReturnValue({ id: 'p1', slug: 's1', title: 'T1' } as any)

      const req = new NextRequest('http://localhost/api/profiles/s1')
      const res = await GET(req, { params: Promise.resolve({ slug: 's1' }) })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.profile).toBeDefined()
      expect(mockProfileService.sanitizeProfileForPublic).toHaveBeenCalledWith(profile)
    })

    it('returns full profile for admin request header', async () => {
      const profile = { id: 'p2', slug: 's2', title: 'T2' } as any
      mockDataService.getProfileBySlug.mockResolvedValue(profile)

    // Construct a lightweight request-like object with a headers.get implementation
    // (NextRequest/Request constructors aren't reliable in the Jest environment).
    const req = ({ headers: { get: (h: string) => (h === 'x-admin-request' ? 'true' : null) } } as unknown) as any
    const res = await GET(req, { params: Promise.resolve({ slug: 's2' }) })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.profile).toEqual(profile)
    })
  })

  describe('PUT', () => {
    it('updates and returns profile on success', async () => {
      const updated = { id: 'p1', slug: 's1', title: 'New Title' } as any
      mockDataService.updateProfile.mockResolvedValue(updated)

  // Use a minimal request-like object with a json() helper instead of the
  // global Request constructor which isn't present in the Jest env.
  const req = ({ json: async () => ({ title: 'New Title' }) } as unknown) as any
  const res = await PUT(req, { params: Promise.resolve({ slug: 's1' }) })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.slug).toBe('s1')
    })

    it('returns 404 when updateProfile throws not found', async () => {
      mockDataService.updateProfile.mockRejectedValue(new Error('not found'))

  const req = ({ json: async () => ({ title: 'x' }) } as unknown) as any
  const res = await PUT(req, { params: Promise.resolve({ slug: 'missing' }) })
      const body = await res.json()

      expect(res.status).toBe(404)
      expect(body.error).toBeDefined()
    })
  })

  describe('DELETE', () => {
    it('returns success message on delete', async () => {
      mockDataService.deleteProfile.mockResolvedValue()

      const req = new NextRequest('http://localhost/api/profiles/s1')
      const res = await DELETE(req, { params: Promise.resolve({ slug: 's1' }) })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.message).toMatch(/deleted successfully/i)
    })

    it('returns 403 when trying to delete default profile', async () => {
      mockDataService.deleteProfile.mockRejectedValue(new Error('Cannot delete the default profile'))

      const req = new NextRequest('http://localhost/api/profiles/default')
      const res = await DELETE(req, { params: Promise.resolve({ slug: 'default' }) })
      const body = await res.json()

      expect(res.status).toBe(403)
      expect(body.error).toBeDefined()
    })
  })
})
