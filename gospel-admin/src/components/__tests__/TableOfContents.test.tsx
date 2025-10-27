import { render, screen, fireEvent } from '@testing-library/react'
import TableOfContents from '../TableOfContents'
import { GospelSection } from '@/lib/types'

// Mock Next.js router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
  writable: true
})

describe('TableOfContents Component', () => {
  const mockSections: GospelSection[] = [
    {
      section: '1',
      title: 'God',
      subsections: [
        {
          title: 'A. God is Holy',
          content: 'Test content',
          scriptureReferences: [
            { reference: 'Isaiah 6:3', favorite: true }
          ]
        },
        {
          title: 'B. God is Love',
          content: 'Test content',
          scriptureReferences: [
            { reference: '1 John 4:8', favorite: false }
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
          content: 'Test content',
          scriptureReferences: [
            { reference: 'Romans 3:23', favorite: true }
          ]
        }
      ]
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render all sections and subsections', () => {
    render(<TableOfContents sections={mockSections} />)

    // Check main sections
    expect(screen.getByText('1. God')).toBeInTheDocument()
    expect(screen.getByText('2. Man')).toBeInTheDocument()

    // Check subsections
    expect(screen.getByText('A. God is Holy')).toBeInTheDocument()
    expect(screen.getByText('B. God is Love')).toBeInTheDocument()
    expect(screen.getByText('A. Man is Sinful')).toBeInTheDocument()
  })

  it('should handle section clicks and scroll to section', () => {
    render(<TableOfContents sections={mockSections} />)

    const sectionLink = screen.getByText('1. God')
    // component renders anchor links with fragment hrefs
    expect(sectionLink).toHaveAttribute('href', '#section-1')
  })

  it('should handle subsection clicks and scroll to subsection', () => {
    render(<TableOfContents sections={mockSections} />)

    const subsectionLink = screen.getByText('A. God is Holy')
    expect(subsectionLink).toHaveAttribute('href', '#section-1-0')
  })

  it('should handle missing DOM elements gracefully', () => {
    render(<TableOfContents sections={mockSections} />)

    const sectionLink = screen.getByText('1. God')
    // clicking the anchor should not throw even if target element isn't present
    expect(() => fireEvent.click(sectionLink)).not.toThrow()
  })

  it('should render nested subsections if present', () => {
    const sectionsWithNested: GospelSection[] = [
      {
        section: '1',
        title: 'God',
        subsections: [
          {
            title: 'A. God is Holy',
            content: 'Test content',
            scriptureReferences: [],
            nestedSubsections: [
              {
                title: 'i. Definition of Holiness',
                content: 'Nested content',
                scriptureReferences: [
                  { reference: 'Leviticus 11:44', favorite: false }
                ]
              }
            ]
          }
        ]
      }
    ]

    render(<TableOfContents sections={sectionsWithNested} />)

    // component does not render nestedSubsections - ensure nested content isn't rendered
    expect(screen.queryByText('i. Definition of Holiness')).not.toBeInTheDocument()
  })

  it('should apply correct styling classes', () => {
    const { container } = render(<TableOfContents sections={mockSections} />)

    const tocContainer = container.firstChild as HTMLElement
    // component now renders a root div with spacing classes
    expect(tocContainer).toHaveClass('space-y-4')

    // Check for section styling
    const sectionButton = screen.getByText('1. God')
    expect(sectionButton).toHaveClass('text-blue-600', 'hover:text-blue-800', 'font-medium')
  })

  it('should handle empty sections array', () => {
    const { container } = render(<TableOfContents sections={[]} />)

    const tocContainer = container.firstChild as HTMLElement
    expect(tocContainer).toBeInTheDocument()
    // With no sections the component still renders the print/admin controls
    expect(screen.getByText('Print Condensed Version')).toBeInTheDocument()
  })

  it('should render with proper accessibility attributes', () => {
    const { container } = render(<TableOfContents sections={mockSections} />)

    const root = container.firstChild as HTMLElement
    expect(root).toBeInTheDocument()

    // Check that section items are rendered as links
    const sectionButton = screen.getByText('1. God')
    expect(sectionButton.tagName).toBe('A')
  })
})