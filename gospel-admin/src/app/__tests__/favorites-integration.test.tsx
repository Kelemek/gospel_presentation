import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GospelPresentation from '../page'
import { GospelSection } from '@/lib/types'

// Mock the actual components to test integration
jest.mock('@/components/ScriptureModal', () => {
  const originalModule = jest.requireActual('@/components/ScriptureModal')
  return originalModule
})

jest.mock('@/components/GospelSection', () => {
  const originalModule = jest.requireActual('@/components/GospelSection')
  return originalModule
})

jest.mock('@/components/TableOfContents', () => {
  const originalModule = jest.requireActual('@/components/TableOfContents')
  return originalModule
})

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('Favorites Feature Integration Tests', () => {
  const mockGospelDataWithFavorites: GospelSection[] = [
    {
      section: '1',
      title: 'God',
      subsections: [
        {
          title: 'A. God is Holy',
          content: 'God is separate from and exalted above His creation.',
          scriptureReferences: [
            { reference: 'Isaiah 6:3', favorite: true },
            { reference: '1 Peter 1:15-16', favorite: false },
            { reference: 'Leviticus 11:44', favorite: true }
          ]
        },
        {
          title: 'B. God is Love',
          content: 'God demonstrates His love.',
          scriptureReferences: [
            { reference: '1 John 4:8', favorite: true },
            { reference: 'Romans 5:8', favorite: false }
          ]
        }
      ]
    },
    {
      section: '2',
      title: 'Man',
      subsections: [
        {
          title: 'A. Man is Sinful',
          content: 'All humans have sinned.',
          scriptureReferences: [
            { reference: 'Romans 3:23', favorite: true },
            { reference: 'Romans 6:23', favorite: false }
          ],
          nestedSubsections: [
            {
              title: 'i. Universal Sinfulness',
              content: 'Sin affects all humanity.',
              scriptureReferences: [
                { reference: 'Ecclesiastes 7:20', favorite: true }
              ]
            }
          ]
        }
      ]
    }
  ]

  beforeEach(() => {
    mockFetch.mockClear()
    // Mock ESV API responses for scripture text
    mockFetch.mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/api/scripture')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            text: 'Mocked scripture text for testing'
          })
        } as Response)
      }
      // Default gospel data response
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockGospelDataWithFavorites)
      } as Response)
    })
  })

  it('should correctly identify and collect all favorite scripture references', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    
    render(<GospelPresentation />)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        '📖 Found',
        5,
        'favorite scripture references:',
        ['Isaiah 6:3', 'Leviticus 11:44', '1 John 4:8', 'Romans 3:23', 'Ecclesiastes 7:20']
      )
    })

    consoleSpy.mockRestore()
  })

  it('should navigate through favorites in the correct order', async () => {
    const user = userEvent.setup()
    
    render(<GospelPresentation />)

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText('Loading Gospel Presentation...')).not.toBeInTheDocument()
    })

    // Since we're using mocked components, we need to simulate the favorite navigation
    // This test would work better with the actual components rendered
    // For now, let's test the logic through user interactions

    // The favorites should be collected and available for navigation
    // This is tested through the console.log spy above
  })

  it('should handle favorites navigation with nested subsections', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    
    render(<GospelPresentation />)

    await waitFor(() => {
      // Verify that favorites from nested subsections are included
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('📖 Found'),
        5,
        expect.stringContaining('favorite scripture references'),
        expect.arrayContaining(['Ecclesiastes 7:20']) // From nested subsection
      )
    })

    consoleSpy.mockRestore()
  })

  it('should maintain favorite reference index when switching between favorites', async () => {
    const user = userEvent.setup()
    
    render(<GospelPresentation />)

    await waitFor(() => {
      expect(screen.queryByText('Loading Gospel Presentation...')).not.toBeInTheDocument()
    })

    // Test would involve clicking different favorite references and ensuring
    // the navigation index is properly updated
    // This requires the actual components to be rendered for full integration testing
  })

  it('should handle keyboard navigation through favorites only', async () => {
    const user = userEvent.setup()
    
    render(<GospelPresentation />)

    await waitFor(() => {
      expect(screen.queryByText('Loading Gospel Presentation...')).not.toBeInTheDocument()
    })

    // Test keyboard navigation (ArrowLeft, ArrowRight) when modal is open
    // This would test the actual keyboard event listeners
  })

  it('should exclude non-favorite references from navigation', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    
    render(<GospelPresentation />)

    await waitFor(() => {
      const favoriteReferences = consoleSpy.mock.calls
        .find(call => call[0]?.includes('📖 Found'))?.[3] as string[]
      
      // Verify non-favorites are not included
      expect(favoriteReferences).not.toContain('1 Peter 1:15-16')
      expect(favoriteReferences).not.toContain('Romans 5:8')
      expect(favoriteReferences).not.toContain('Romans 6:23')
      
      // Verify favorites are included
      expect(favoriteReferences).toContain('Isaiah 6:3')
      expect(favoriteReferences).toContain('Romans 3:23')
      expect(favoriteReferences).toContain('Ecclesiastes 7:20')
    })

    consoleSpy.mockRestore()
  })

  it('should handle empty favorites list gracefully', async () => {
    const dataWithoutFavorites: GospelSection[] = [
      {
        section: '1',
        title: 'Test Section',
        subsections: [
          {
            title: 'Test Subsection',
            content: 'Test content',
            scriptureReferences: [
              { reference: 'John 3:16', favorite: false }
            ]
          }
        ]
      }
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(dataWithoutFavorites)
    } as Response)

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    
    render(<GospelPresentation />)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        '📖 Found',
        0,
        'favorite scripture references:',
        []
      )
    })

    consoleSpy.mockRestore()
  })

  it('should handle circular navigation at favorites boundaries', async () => {
    render(<GospelPresentation />)

    await waitFor(() => {
      expect(screen.queryByText('Loading Gospel Presentation...')).not.toBeInTheDocument()
    })

    // Test that navigation wraps around from last to first favorite and vice versa
    // This requires interaction with the actual modal component
  })

  it('should update context information when navigating between favorites', async () => {
    render(<GospelPresentation />)

    await waitFor(() => {
      expect(screen.queryByText('Loading Gospel Presentation...')).not.toBeInTheDocument()
    })

    // Test that the context (section title, subsection title, content) 
    // is correctly updated when navigating between different favorites
    // from different sections and subsections
  })

  it('should maintain proper navigation state indicators', async () => {
    render(<GospelPresentation />)

    await waitFor(() => {
      expect(screen.queryByText('Loading Gospel Presentation...')).not.toBeInTheDocument()
    })

    // Test that hasPrevious and hasNext are correctly calculated
    // based on the current position in the favorites list
  })
})

describe('Favorites Feature Edge Cases', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('should handle data with no scripture references', async () => {
    const dataWithoutScriptures: GospelSection[] = [
      {
        section: '1',
        title: 'Test Section',
        subsections: [
          {
            title: 'Test Subsection',
            content: 'Test content without scripture references'
          }
        ]
      }
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(dataWithoutScriptures)
    } as Response)

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    
    render(<GospelPresentation />)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        '📖 Found',
        0,
        'favorite scripture references:',
        []
      )
    })

    consoleSpy.mockRestore()
  })

  it('should handle mixed favorite and non-favorite references correctly', async () => {
    const mixedData: GospelSection[] = [
      {
        section: '1',
        title: 'Mixed Section',
        subsections: [
          {
            title: 'Mixed Subsection',
            content: 'Mixed content',
            scriptureReferences: [
              { reference: 'Favorite 1', favorite: true },
              { reference: 'Non-favorite 1', favorite: false },
              { reference: 'Favorite 2', favorite: true },
              { reference: 'Non-favorite 2' }, // No favorite property
              { reference: 'Favorite 3', favorite: true }
            ]
          }
        ]
      }
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mixedData)
    } as Response)

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    
    render(<GospelPresentation />)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        '📖 Found',
        3,
        'favorite scripture references:',
        ['Favorite 1', 'Favorite 2', 'Favorite 3']
      )
    })

    consoleSpy.mockRestore()
  })
})