import { getGospelPresentationData } from '../data'
import { GospelSection } from '../types'

// Mock fetch for data tests
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('Data Utility Functions', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  describe('getGospelPresentationData', () => {
    it('should fetch and return gospel presentation data successfully', async () => {
      const mockData: GospelSection[] = [
        {
          section: '1',
          title: 'Test Section',
          subsections: [
            {
              title: 'Test Subsection',
              content: 'Test content',
              scriptureReferences: [{ reference: 'John 3:16' }]
            }
          ]
        }
      ]

      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ content: { sections: mockData } })
      }
      mockFetch.mockResolvedValueOnce(mockResponse as Response)

      const result = await getGospelPresentationData()
      
      expect(mockFetch).toHaveBeenCalledWith('/api/profiles/default', {
        cache: 'no-store'
      })
      expect(result).toEqual(mockData)
    })

    it('should return fallback data when API request fails', async () => {
      const mockResponse = {
        ok: false,
        status: 500
      }
      mockFetch.mockResolvedValueOnce(mockResponse as Response)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      const result = await getGospelPresentationData()
      
      // Should return fallback data structure
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      expect(result[0]).toHaveProperty('section')
      expect(result[0]).toHaveProperty('title')
      expect(result[0]).toHaveProperty('subsections')
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error fetching gospel presentation data:', 
        expect.any(Error)
      )
      consoleSpy.mockRestore()
    })

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      const result = await getGospelPresentationData()
      
      // Should return fallback data
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error fetching gospel presentation data:', 
        expect.any(Error)
      )
      consoleSpy.mockRestore()
    })

    it('should handle malformed JSON response', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      }
      mockFetch.mockResolvedValueOnce(mockResponse as unknown as Response)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      const result = await getGospelPresentationData()
      
      // Should return fallback data
      expect(Array.isArray(result)).toBe(true)
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error fetching gospel presentation data:', 
        expect.any(Error)
      )
      consoleSpy.mockRestore()
    })
  })

  describe('fallback data structure', () => {
    it('should have valid gospel presentation structure', async () => {
      // Force a failure to get fallback data
      mockFetch.mockRejectedValueOnce(new Error('Test error'))
      jest.spyOn(console, 'error').mockImplementation()
      
      const result = await getGospelPresentationData()
      
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      
      // Verify structure of first section
      const firstSection = result[0]
      expect(firstSection).toHaveProperty('section')
      expect(firstSection).toHaveProperty('title')
      expect(firstSection).toHaveProperty('subsections')
      expect(Array.isArray(firstSection.subsections)).toBe(true)
      
      // Verify structure of first subsection
      if (firstSection.subsections.length > 0) {
        const firstSubsection = firstSection.subsections[0]
        expect(firstSubsection).toHaveProperty('title')
        expect(firstSubsection).toHaveProperty('content')
        expect(firstSubsection).toHaveProperty('scriptureReferences')
        expect(Array.isArray(firstSubsection.scriptureReferences)).toBe(true)
        
        // Verify scripture reference structure
        if (firstSubsection.scriptureReferences && firstSubsection.scriptureReferences.length > 0) {
          const firstReference = firstSubsection.scriptureReferences[0]
          expect(firstReference).toHaveProperty('reference')
          expect(typeof firstReference.reference).toBe('string')
        }
      }
    })
  })
})