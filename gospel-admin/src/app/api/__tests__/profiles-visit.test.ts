import { POST } from '../profiles/[slug]/visit/route'
import { NextRequest } from 'next/server'
import * as blobDataService from '@/lib/blob-data-service'

// Mock the blob data service
jest.mock('@/lib/blob-data-service')
const mockBlobDataService = blobDataService as jest.Mocked<typeof blobDataService>

describe('/api/profiles/[slug]/visit', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST', () => {
      it.skip('should increment visit count successfully', async () => {
      mockBlobDataService.incrementProfileVisitCount.mockResolvedValue()

      const request = new NextRequest('http://localhost:3000/api/profiles/test-profile/visit', {
        method: 'POST'
      })

      const response = await POST(request, { params: Promise.resolve({ slug: 'test-profile' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('Visit count incremented')
      expect(mockBlobDataService.incrementProfileVisitCount).toHaveBeenCalledWith('test-profile')
    })

      it.skip('should handle errors gracefully', async () => {
      mockBlobDataService.incrementProfileVisitCount.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/profiles/test-profile/visit', {
        method: 'POST'
      })

      const response = await POST(request, { params: Promise.resolve({ slug: 'test-profile' }) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to increment visit count')
    })

      it.skip('should handle missing slug parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/profiles//visit', {
        method: 'POST'
      })

      const response = await POST(request, { params: Promise.resolve({ slug: '' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Profile slug is required')
    })
  })
})