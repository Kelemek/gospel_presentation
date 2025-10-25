import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GospelPresentation from '../page'
import { GospelSection } from '@/lib/types'

// Mock the components
jest.mock('@/components/ScriptureModal', () => {
  return function MockScriptureModal({ 
    reference, 
    isOpen, 
    onClose, 
    onPrevious, 
    onNext, 
    hasPrevious, 
    hasNext, 
    currentIndex, 
    totalFavorites, 
    context 
  }: any) {
    if (!isOpen) return null
    return (
      <div data-testid="scripture-modal">
        <div>Reference: {reference}</div>
        <div>Index: {currentIndex + 1} of {totalFavorites}</div>
        {context && <div>Context: {context.sectionTitle}</div>}
        <button onClick={onClose} data-testid="close-modal">Close</button>
        {hasPrevious && <button onClick={onPrevious} data-testid="previous-btn">Previous</button>}
        {hasNext && <button onClick={onNext} data-testid="next-btn">Next</button>}
      </div>
    )
  }
})

jest.mock('@/components/TableOfContents', () => {
  return function MockTableOfContents({ sections }: any) {
    return (
      <div data-testid="table-of-contents">
        {sections.map((section: any) => (
          <div key={section.section} data-testid={`toc-section-${section.section}`}>
            {section.title}
          </div>
        ))}
      </div>
    )
  }
})

jest.mock('@/components/GospelSection', () => {
  return function MockGospelSection({ section, onScriptureClick }: any) {
    return (
      <div data-testid={`gospel-section-${section.section}`}>
        <h2>{section.title}</h2>
        {section.subsections.map((subsection: any, idx: number) => (
          <div key={idx}>
            <h3>{subsection.title}</h3>
            <p>{subsection.content}</p>
            {subsection.scriptureReferences?.map((ref: any, refIdx: number) => (
              <button
                key={refIdx}
                data-testid={`scripture-ref-${ref.reference}`}
                onClick={() => onScriptureClick(ref.reference)}
              >
                {ref.reference} {ref.favorite && '⭐'}
              </button>
            ))}
          </div>
        ))}
      </div>
    )
  }
})

// Mock fetch globally
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('GospelPresentation Page', () => {
  const mockGospelData: GospelSection[] = [
    {
      section: '1',
      title: 'God',
      subsections: [
        {
          title: 'A. God is Holy',
          content: 'God is separate from and exalted above His creation.',
          scriptureReferences: [
            { reference: 'Isaiah 6:3', favorite: true },
            { reference: '1 Peter 1:15-16', favorite: false }
          ]
        },
        {
          title: 'B. God is Love',
          content: 'God demonstrates His love through His actions.',
          scriptureReferences: [
            { reference: '1 John 4:8', favorite: true },
            { reference: 'Romans 5:8' }
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
          content: 'All humans have sinned and fall short.',
          scriptureReferences: [
            { reference: 'Romans 3:23', favorite: true }
          ]
        }
      ]
    }
  ]

  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('should render loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

    render(<GospelPresentation />)

    expect(screen.getByText('Loading Gospel Presentation...')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument() // Loading spinner
  })

  it('should load and display gospel presentation data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockGospelData)
    } as Response)

    render(<GospelPresentation />)

    await waitFor(() => {
      expect(screen.getByText('Presenting the Gospel in its Context')).toBeInTheDocument()
    })

    expect(screen.getByText('God')).toBeInTheDocument()
    expect(screen.getByText('Man')).toBeInTheDocument()
    expect(screen.getByTestId('gospel-section-1')).toBeInTheDocument()
    expect(screen.getByTestId('gospel-section-2')).toBeInTheDocument()
  })

  it('should handle data loading errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    mockFetch.mockRejectedValueOnce(new Error('API Error'))

    render(<GospelPresentation />)

    await waitFor(() => {
      expect(screen.queryByText('Loading Gospel Presentation...')).not.toBeInTheDocument()
    })

    expect(consoleSpy).toHaveBeenCalledWith('Error loading data:', expect.any(Error))
    consoleSpy.mockRestore()
  })

  it('should collect and track favorite scripture references', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockGospelData)
    } as Response)

    render(<GospelPresentation />)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        '📖 Found',
        3,
        'favorite scripture references:',
        ['Isaiah 6:3', '1 John 4:8', 'Romans 3:23']
      )
    })

    consoleSpy.mockRestore()
  })

  it('should open scripture modal when scripture reference is clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockGospelData)
    } as Response)

    const user = userEvent.setup()
    render(<GospelPresentation />)

    await waitFor(() => {
      expect(screen.getByTestId('scripture-ref-Isaiah 6:3')).toBeInTheDocument()
    })

    await user.click(screen.getByTestId('scripture-ref-Isaiah 6:3'))

    expect(screen.getByTestId('scripture-modal')).toBeInTheDocument()
    expect(screen.getByText('Reference: Isaiah 6:3')).toBeInTheDocument()
  })

  it('should navigate between favorite references only', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockGospelData)
    } as Response)

    const user = userEvent.setup()
    render(<GospelPresentation />)

    await waitFor(() => {
      expect(screen.getByTestId('scripture-ref-Isaiah 6:3')).toBeInTheDocument()
    })

    // Click on first favorite
    await user.click(screen.getByTestId('scripture-ref-Isaiah 6:3'))

    expect(screen.getByText('Index: 1 of 3')).toBeInTheDocument()
    expect(screen.getByTestId('next-btn')).toBeInTheDocument()

    // Navigate to next favorite
    await user.click(screen.getByTestId('next-btn'))
    expect(screen.getByText('Reference: 1 John 4:8')).toBeInTheDocument()
    expect(screen.getByText('Index: 2 of 3')).toBeInTheDocument()

    // Navigate to previous
    await user.click(screen.getByTestId('previous-btn'))
    expect(screen.getByText('Reference: Isaiah 6:3')).toBeInTheDocument()
    expect(screen.getByText('Index: 1 of 3')).toBeInTheDocument()
  })

  it('should handle keyboard navigation in scripture modal', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockGospelData)
    } as Response)

    const user = userEvent.setup()
    render(<GospelPresentation />)

    await waitFor(() => {
      expect(screen.getByTestId('scripture-ref-Isaiah 6:3')).toBeInTheDocument()
    })

    // Open modal
    await user.click(screen.getByTestId('scripture-ref-Isaiah 6:3'))

    // Test arrow key navigation
    await user.keyboard('{ArrowRight}')
    expect(screen.getByText('Reference: 1 John 4:8')).toBeInTheDocument()

    await user.keyboard('{ArrowLeft}')
    expect(screen.getByText('Reference: Isaiah 6:3')).toBeInTheDocument()
  })

  it('should toggle table of contents menu', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockGospelData)
    } as Response)

    const user = userEvent.setup()
    render(<GospelPresentation />)

    await waitFor(() => {
      expect(screen.getByText('Table of Contents')).toBeInTheDocument()
    })

    // Menu should be closed initially
    expect(screen.queryByTestId('table-of-contents')).not.toBeInTheDocument()

    // Open menu
    await user.click(screen.getByText('Table of Contents'))
    expect(screen.getByTestId('table-of-contents')).toBeInTheDocument()

    // Close menu by clicking close button
    await user.click(screen.getByText('×'))
    expect(screen.queryByTestId('table-of-contents')).not.toBeInTheDocument()
  })

  it('should close menu when clicking outside', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockGospelData)
    } as Response)

    const user = userEvent.setup()
    render(<GospelPresentation />)

    await waitFor(() => {
      expect(screen.getByText('Table of Contents')).toBeInTheDocument()
    })

    // Open menu
    await user.click(screen.getByText('Table of Contents'))
    expect(screen.getByTestId('table-of-contents')).toBeInTheDocument()

    // Click outside to close (click on the overlay)
    const overlay = document.querySelector('.fixed.inset-0')
    if (overlay) {
      fireEvent.click(overlay)
    }

    await waitFor(() => {
      expect(screen.queryByTestId('table-of-contents')).not.toBeInTheDocument()
    })
  })

  it('should close scripture modal', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockGospelData)
    } as Response)

    const user = userEvent.setup()
    render(<GospelPresentation />)

    await waitFor(() => {
      expect(screen.getByTestId('scripture-ref-Isaiah 6:3')).toBeInTheDocument()
    })

    // Open modal
    await user.click(screen.getByTestId('scripture-ref-Isaiah 6:3'))
    expect(screen.getByTestId('scripture-modal')).toBeInTheDocument()

    // Close modal
    await user.click(screen.getByTestId('close-modal'))
    expect(screen.queryByTestId('scripture-modal')).not.toBeInTheDocument()
  })

  it('should display scripture context in modal', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockGospelData)
    } as Response)

    const user = userEvent.setup()
    render(<GospelPresentation />)

    await waitFor(() => {
      expect(screen.getByTestId('scripture-ref-Isaiah 6:3')).toBeInTheDocument()
    })

    await user.click(screen.getByTestId('scripture-ref-Isaiah 6:3'))

    expect(screen.getByText('Context: 1. God')).toBeInTheDocument()
  })

  it('should handle circular navigation through favorites', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockGospelData)
    } as Response)

    const user = userEvent.setup()
    render(<GospelPresentation />)

    await waitFor(() => {
      expect(screen.getByTestId('scripture-ref-Romans 3:23')).toBeInTheDocument()
    })

    // Start with last favorite
    await user.click(screen.getByTestId('scripture-ref-Romans 3:23'))
    expect(screen.getByText('Index: 3 of 3')).toBeInTheDocument()

    // Next should wrap to first
    await user.click(screen.getByTestId('next-btn'))
    expect(screen.getByText('Reference: Isaiah 6:3')).toBeInTheDocument()
    expect(screen.getByText('Index: 1 of 3')).toBeInTheDocument()

    // Previous should wrap to last
    await user.click(screen.getByTestId('previous-btn'))
    expect(screen.getByText('Reference: Romans 3:23')).toBeInTheDocument()
    expect(screen.getByText('Index: 3 of 3')).toBeInTheDocument()
  })

  it('should render all required UI elements', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockGospelData)
    } as Response)

    render(<GospelPresentation />)

    await waitFor(() => {
      expect(screen.getByText('Presenting the Gospel in its Context')).toBeInTheDocument()
    })

    // Header content
    expect(screen.getByText('Faithfully Sowing the Seed According to the Scriptures')).toBeInTheDocument()
    expect(screen.getByText('By Dr. Stuart Scott')).toBeInTheDocument()

    // Footer content
  // Removed reference to www.oneeightycounseling.com
    expect(screen.getByText(/Scripture quotations are from the ESV® Bible/)).toBeInTheDocument()

    // Navigation elements
    expect(screen.getByText('Table of Contents')).toBeInTheDocument()
  })
})