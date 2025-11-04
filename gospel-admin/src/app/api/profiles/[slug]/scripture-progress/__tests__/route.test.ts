import { POST, DELETE } from '../route'
import * as dataService from '@/lib/data-service'

jest.mock('@/lib/data-service')

const mockDataService = dataService as jest.Mocked<typeof dataService>

describe('/api/profiles/[slug]/scripture-progress', () => {
  beforeEach(() => jest.resetAllMocks())

  describe('POST', () => {
    it('returns 400 for default profile', async () => {
      const req = ({ json: async () => ({ reference: 'John 3:16', sectionId: 's', subsectionId: 'ss', viewedAt: new Date().toISOString() }) } as unknown) as any
      const res = await POST(req, { params: Promise.resolve({ slug: 'default' }) })
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toMatch(/Cannot track progress for default profile/i)
    })

    it('returns 400 when required fields missing', async () => {
      const req = ({ json: async () => ({ reference: '', sectionId: '', subsectionId: '' }) } as unknown) as any
      const res = await POST(req, { params: Promise.resolve({ slug: 's1' }) })
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toMatch(/Missing required fields/i)
    })

    it('updates profile and returns lastViewedScripture on success', async () => {
      const progress = { reference: 'John 3:16', sectionId: 'sec1', subsectionId: 'sub1', viewedAt: new Date().toISOString() }
      const updatedProfile = { lastViewedScripture: { reference: progress.reference, sectionId: progress.sectionId, subsectionId: progress.subsectionId, viewedAt: new Date(progress.viewedAt) } } as any

      mockDataService.updateProfile.mockResolvedValue(updatedProfile)

      const req = ({ json: async () => progress } as unknown) as any
      const res = await POST(req, { params: Promise.resolve({ slug: 's1' }) })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.lastViewedScripture).toBeDefined()
      expect(body.lastViewedScripture.reference).toBe(progress.reference)
      expect(mockDataService.updateProfile).toHaveBeenCalledWith('s1', expect.any(Object))
    })

    it('returns 500 when updateProfile throws', async () => {
      mockDataService.updateProfile.mockRejectedValue(new Error('DB'))

      const req = ({ json: async () => ({ reference: 'R', sectionId: 's', subsectionId: 'ss', viewedAt: new Date().toISOString() }) } as unknown) as any
      const res = await POST(req, { params: Promise.resolve({ slug: 's1' }) })
      const body = await res.json()

      expect(res.status).toBe(500)
      expect(body.error).toMatch(/Failed to update scripture progress/i)
    })
  })

  describe('DELETE', () => {
    it('returns 400 for default profile', async () => {
      const req = ({} as any)
      const res = await DELETE(req, { params: Promise.resolve({ slug: 'default' }) })
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toMatch(/Cannot reset progress for default profile/i)
    })

    it('resets progress and returns success', async () => {
      mockDataService.updateProfile.mockResolvedValue(undefined as any)

      const req = ({} as any)
      const res = await DELETE(req, { params: Promise.resolve({ slug: 's1' }) })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.message).toMatch(/reset successfully/i)
      expect(mockDataService.updateProfile).toHaveBeenCalledWith('s1', { lastViewedScripture: null })
    })

    it('returns 500 when updateProfile throws', async () => {
      mockDataService.updateProfile.mockRejectedValue(new Error('oh no'))

      const req = ({} as any)
      const res = await DELETE(req, { params: Promise.resolve({ slug: 's1' }) })
      const body = await res.json()

      expect(res.status).toBe(500)
      expect(body.error).toMatch(/Failed to reset scripture progress/i)
    })
  })
})
