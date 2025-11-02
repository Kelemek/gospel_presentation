import { POST } from '../profiles/[slug]/visit/route'
import { NextRequest } from 'next/server'
import * as supabaseDataService from '@/lib/supabase-data-service'

// Mock the Supabase data service
jest.mock('@/lib/supabase-data-service')
const mockDataService = supabaseDataService as jest.Mocked<typeof supabaseDataService>

describe('/api/profiles/[slug]/visit', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST', () => {
    it('should increment visit count successfully', async () => {
      mockDataService.incrementProfileVisitCount.mockResolvedValue()

      const request = new NextRequest('http://localhost:3000/api/profiles/test-profile/visit', {
        method: 'POST'
      })

      const response = await POST(request, { params: Promise.resolve({ slug: 'test-profile' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('Visit count incremented')
      expect(mockDataService.incrementProfileVisitCount).toHaveBeenCalledWith('test-profile')
    })

      it('should handle errors gracefully', async () => {
        // Simulate the data service throwing; the route should swallow the
        // error and still return a 200 response so visit tracking doesn't
        // break the page.
        mockDataService.incrementProfileVisitCount.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/profiles/test-profile/visit', {
        method: 'POST'
      })

      const response = await POST(request, { params: Promise.resolve({ slug: 'test-profile' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(false)
    })

    it('should handle missing slug parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/profiles//visit', {
        method: 'POST'
      })

      const response = await POST(request, { params: Promise.resolve({ slug: '' }) })
      const data = await response.json()

      // Missing slug should be handled gracefully by the route; ensure
      // it does not throw and returns a 200-level response so the page
      // continues to function.
      expect(response.status).toBe(200)
      expect(data.success).toBe(false)
    })
  })
})