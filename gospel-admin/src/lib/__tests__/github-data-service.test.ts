import { githubDataService } from '../github-data-service'
import { GospelSection } from '../types'

// Mock fetch for GitHub service tests
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('GitHubDataService', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    // Ensure GitHub token is set for tests
    process.env.GITHUB_TOKEN = 'test-github-token'
  })

  describe('getData', () => {
    it('should fetch and parse data from GitHub API successfully', async () => {
      const mockGospelData: GospelSection[] = [
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

      const base64Content = Buffer.from(JSON.stringify(mockGospelData)).toString('base64')
      
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          name: 'gospel-presentation.json',
          path: 'data/gospel-presentation.json',
          sha: 'mock-sha',
          content: base64Content,
          encoding: 'base64'
        })
      }
      mockFetch.mockResolvedValueOnce(mockResponse as unknown as Response)

      const result = await githubDataService.getData()
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/Kelemek/gospel_presentation/contents/data/gospel-presentation.json',
        {
          headers: {
            'Authorization': 'token test-github-token',
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'Gospel-Presentation-Admin/1.0'
          }
        }
      )
      expect(result).toEqual(mockGospelData)
    })

    it('should handle GitHub API errors gracefully', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found'
      }
      mockFetch.mockResolvedValueOnce(mockResponse as unknown as Response)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      await expect(githubDataService.getData()).rejects.toThrow('Failed to fetch gospel presentation data')
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error fetching data from GitHub:', 
        expect.any(Error)
      )
      consoleSpy.mockRestore()
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      await expect(githubDataService.getData()).rejects.toThrow('Failed to fetch gospel presentation data')
      
      consoleSpy.mockRestore()
    })

    it('should handle invalid JSON in GitHub response', async () => {
      const invalidBase64 = Buffer.from('invalid json').toString('base64')
      
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          content: invalidBase64,
          encoding: 'base64'
        })
      }
      mockFetch.mockResolvedValueOnce(mockResponse as unknown as Response)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      await expect(githubDataService.getData()).rejects.toThrow('Failed to fetch gospel presentation data')
      
      consoleSpy.mockRestore()
    })
  })

  describe('saveData', () => {
    it('should save data to GitHub successfully', async () => {
      const testData: GospelSection[] = [
        {
          section: '1',
          title: 'Updated Section',
          subsections: []
        }
      ]

      // Mock getting current file (for SHA)
      const mockCurrentFileResponse = {
        ok: true,
        json: () => Promise.resolve({
          sha: 'current-file-sha',
          content: 'base64content'
        })
      }
      
      // Mock updating file
      const mockUpdateResponse = {
        ok: true,
        json: () => Promise.resolve({
          commit: {
            sha: 'new-commit-sha',
            message: 'Update gospel presentation data via admin interface'
          }
        })
      }

      mockFetch
        .mockResolvedValueOnce(mockCurrentFileResponse as unknown as Response)
        .mockResolvedValueOnce(mockUpdateResponse as unknown as Response)

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      
      await githubDataService.saveData(testData)
      
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Successfully updated gospel presentation data:', 
        'new-commit-sha'
      )
      
      consoleSpy.mockRestore()
    })

    it('should use custom commit message when provided', async () => {
      const testData: GospelSection[] = []
      const customMessage = 'Custom commit message'

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ sha: 'test-sha' })
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ commit: { sha: 'new-sha' } })
        } as unknown as Response)

      jest.spyOn(console, 'log').mockImplementation()
      
      await githubDataService.saveData(testData, customMessage)
      
      const updateCall = mockFetch.mock.calls[1]
      const requestBody = JSON.parse(updateCall[1]?.body as string)
      expect(requestBody.message).toBe(customMessage)
    })

    it('should throw error when GitHub token is missing', async () => {
      // Mock the private token property by overriding it
      const originalToken = (githubDataService as any).token
      ;(githubDataService as any).token = ''
      
      await expect(githubDataService.saveData([])).rejects.toThrow(
        'GitHub token is required for saving data'
      )
      
      // Restore token for other tests
      ;(githubDataService as any).token = originalToken
    })

    it('should handle GitHub API errors during save', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden'
      } as unknown as Response)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      await expect(githubDataService.saveData([])).rejects.toThrow('Failed to save gospel presentation data')
      
      consoleSpy.mockRestore()
    })
  })

  describe('getCommitHistory', () => {
    it('should fetch commit history successfully', async () => {
      const mockCommits = [
        {
          sha: 'commit-1',
          commit: {
            message: 'First commit',
            author: { name: 'Test User', date: '2023-01-01T00:00:00Z' }
          },
          html_url: 'https://github.com/test/commit1'
        },
        {
          sha: 'commit-2', 
          commit: {
            message: 'Second commit',
            author: { name: 'Another User', date: '2023-01-02T00:00:00Z' }
          },
          html_url: 'https://github.com/test/commit2'
        }
      ]

      const mockResponse = {
        ok: true,
        json: () => Promise.resolve(mockCommits)
      }
      mockFetch.mockResolvedValueOnce(mockResponse as unknown as Response)

      const result = await githubDataService.getCommitHistory(2)
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/Kelemek/gospel_presentation/commits?path=data/gospel-presentation.json&per_page=2',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'token test-github-token'
          })
        })
      )

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        sha: 'commit-1',
        message: 'First commit',
        author: 'Test User',
        date: '2023-01-01T00:00:00Z',
        url: 'https://github.com/test/commit1'
      })
    })

    it('should use default limit when not specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      } as unknown as Response)

      await githubDataService.getCommitHistory()
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('per_page=10'),
        expect.any(Object)
      )
    })

    it('should handle commit history API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as unknown as Response)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      await expect(githubDataService.getCommitHistory()).rejects.toThrow('Failed to fetch commit history')
      
      consoleSpy.mockRestore()
    })
  })
})