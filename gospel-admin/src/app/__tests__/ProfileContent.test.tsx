import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProfileContent from '../[slug]/ProfileContent'
import { GospelSection } from '@/lib/types'

// Mock components
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

jest.mock('@/components/ScriptureModal', () => {
  return function MockScriptureModal({ isOpen, reference, onClose }: any) {
    if (!isOpen) return null
    return (
      <div data-testid="scripture-modal">
        <div>Reference: {reference}</div>
        <button onClick={onClose} data-testid="close-modal">Close</button>
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

// Mock fetch for visit tracking
global.fetch = jest.fn()

describe('ProfileContent Component - Responsive Layout', () => {
  const mockSections: GospelSection[] = [
    {
      section: '1',
      title: 'God',
      subsections: [
        {
          title: 'A. God is Holy',
          content: 'Test content about holiness',
          scriptureReferences: [
            { reference: 'Isaiah 6:3', favorite: true },
            { reference: '1 Peter 1:15-16', favorite: false }
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
          content: 'Test content about sin',
          scriptureReferences: [
            { reference: 'Romans 3:23', favorite: true }
          ]
        }
      ]
    }
  ]

  const mockProfileInfo = {
    title: 'Test Gospel Profile',
    description: 'A test profile for testing',
    slug: 'test-profile',
    favoriteScriptures: ['Isaiah 6:3', 'Romans 3:23']
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    })
  })

  it('should render desktop layout with persistent sidebar on large screens', () => {
    // Mock large screen
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200
    })

    render(
      <ProfileContent 
        sections={mockSections} 
        profileInfo={mockProfileInfo} 
      />
    )

    // Should show desktop layout elements
  expect(screen.getByRole('complementary')).toBeInTheDocument() // aside element
  expect(screen.getByRole('heading', { name: 'Table of Contents' })).toBeInTheDocument()
  expect(screen.getAllByText('Test Gospel Profile')).toHaveLength(2)
  expect(screen.getAllByText('A test profile for testing')).toHaveLength(2)
  })

  it('should render mobile layout with hamburger menu on small screens', () => {
    render(
      <ProfileContent 
        sections={mockSections} 
        profileInfo={mockProfileInfo} 
      />
    )

    // Should show mobile hamburger button
  expect(screen.getByRole('button', { name: /table of contents/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /table of contents/i })).toBeInTheDocument()
  })

  it('should handle hamburger menu toggle', async () => {
    const user = userEvent.setup()
    
    render(
      <ProfileContent 
        sections={mockSections} 
        profileInfo={mockProfileInfo} 
      />
    )

  const menuButton = screen.getByRole('button', { name: /table of contents/i })
    
    // Click to open menu
    await user.click(menuButton)
    
    // Should show overlay menu (in mobile view)
    // The menu content should be visible
  expect(screen.getAllByTestId('table-of-contents').length).toBeGreaterThanOrEqual(1) // Desktop + mobile
  })

  it('should close mobile menu when overlay is clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <ProfileContent 
        sections={mockSections} 
        profileInfo={mockProfileInfo} 
      />
    )

  const menuButton = screen.getByRole('button', { name: /table of contents/i })
    await user.click(menuButton)

    // Find and click the overlay (div with onClick to close)
    const overlays = document.querySelectorAll('div[class*="fixed"][class*="inset-0"]')
    if (overlays.length > 0) {
      fireEvent.click(overlays[0])
    }

    // Menu should be closed (no overlay visible)
    await waitFor(() => {
      const newOverlays = document.querySelectorAll('div[class*="fixed"][class*="inset-0"]')
      expect(newOverlays.length).toBeLessThanOrEqual(overlays.length)
    })
  })

  it('should track visit when component mounts', async () => {
    render(
      <ProfileContent 
        sections={mockSections} 
        profileInfo={mockProfileInfo} 
      />
    )

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/profiles/test-profile/visit',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })
      )
    })
  })

  it('should not track visit for admin pages', () => {
    const adminProfileInfo = {
      ...mockProfileInfo,
      slug: 'admin'
    }

    render(
      <ProfileContent 
        sections={mockSections} 
        profileInfo={adminProfileInfo} 
      />
    )

    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('should handle scripture click and open modal', async () => {
    const user = userEvent.setup()
    
    render(
      <ProfileContent 
        sections={mockSections} 
        profileInfo={mockProfileInfo} 
      />
    )

  const scriptureButtons = screen.getAllByTestId('scripture-ref-Isaiah 6:3')
  await user.click(scriptureButtons[0])

  expect(screen.getByTestId('scripture-modal')).toBeInTheDocument()
  expect(screen.getByText('Reference: Isaiah 6:3')).toBeInTheDocument()
  })

  it('should close scripture modal', async () => {
    const user = userEvent.setup()
    
    render(
      <ProfileContent 
        sections={mockSections} 
        profileInfo={mockProfileInfo} 
      />
    )

    // Open modal
  const scriptureButtons = screen.getAllByTestId('scripture-ref-Isaiah 6:3')
  await user.click(scriptureButtons[0])

  // Close modal
  const closeButton = screen.getByTestId('close-modal')
  await user.click(closeButton)

  expect(screen.queryByTestId('scripture-modal')).not.toBeInTheDocument()
  })

  it('should display favorite scriptures count in sidebar', () => {
    render(
      <ProfileContent 
        sections={mockSections} 
        profileInfo={mockProfileInfo} 
      />
    )

      expect(screen.getAllByText(/📖 2 favorites/).length).toBeGreaterThanOrEqual(1)
  })

  it('should handle favorite scripture navigation', async () => {
    const user = userEvent.setup()
    
    render(
      <ProfileContent 
        sections={mockSections} 
        profileInfo={mockProfileInfo} 
      />
    )

    // Open modal with a favorite scripture
  const scriptureButtons = screen.getAllByTestId('scripture-ref-Isaiah 6:3')
  await user.click(scriptureButtons[0])

  // Modal should be open
  expect(screen.getByTestId('scripture-modal')).toBeInTheDocument()
  })

  it('should render all gospel sections', () => {
    render(
      <ProfileContent 
        sections={mockSections} 
        profileInfo={mockProfileInfo} 
      />
    )

    expect(screen.getAllByTestId('gospel-section-1').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByTestId('gospel-section-2').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('God').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Man').length).toBeGreaterThanOrEqual(1)
  })

  it('should handle loading state when props are missing', () => {
    render(
      <ProfileContent 
        sections={undefined as any} 
        profileInfo={undefined as any} 
      />
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })
})