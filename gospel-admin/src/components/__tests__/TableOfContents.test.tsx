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
    // Mock getElementById to return a mock element
    const mockElement = { scrollIntoView: jest.fn() }
    jest.spyOn(document, 'getElementById').mockReturnValue(mockElement as any)

    render(<TableOfContents sections={mockSections} />)

    const sectionLink = screen.getByText('1. God')
    fireEvent.click(sectionLink)

    expect(document.getElementById).toHaveBeenCalledWith('section-1')
    expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start'
    })
  })

  it('should handle subsection clicks and scroll to subsection', () => {
    const mockElement = { scrollIntoView: jest.fn() }
    jest.spyOn(document, 'getElementById').mockReturnValue(mockElement as any)

    render(<TableOfContents sections={mockSections} />)

    const subsectionLink = screen.getByText('A. God is Holy')
    fireEvent.click(subsectionLink)

    expect(document.getElementById).toHaveBeenCalledWith('subsection-1-0')
    expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start'
    })
  })

  it('should handle missing DOM elements gracefully', () => {
    jest.spyOn(document, 'getElementById').mockReturnValue(null)
    jest.spyOn(console, 'warn').mockImplementation()

    render(<TableOfContents sections={mockSections} />)

    const sectionLink = screen.getByText('1. God')
    fireEvent.click(sectionLink)

    expect(document.getElementById).toHaveBeenCalledWith('section-1')
    expect(console.warn).toHaveBeenCalledWith('Element with id section-1 not found')
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

    expect(screen.getByText('i. Definition of Holiness')).toBeInTheDocument()
  })

  it('should apply correct styling classes', () => {
    render(<TableOfContents sections={mockSections} />)

    const tocContainer = screen.getByRole('navigation')
    expect(tocContainer).toHaveClass('space-y-3')

    // Check for section styling
    const sectionButton = screen.getByText('1. God')
    expect(sectionButton).toHaveClass('text-slate-700', 'hover:text-slate-900', 'font-medium')
  })

  it('should handle empty sections array', () => {
    render(<TableOfContents sections={[]} />)

    const tocContainer = screen.getByRole('navigation')
    expect(tocContainer).toBeInTheDocument()
    expect(tocContainer).toBeEmptyDOMElement()
  })

  it('should render with proper accessibility attributes', () => {
    render(<TableOfContents sections={mockSections} />)

    const navigation = screen.getByRole('navigation')
    expect(navigation).toHaveAttribute('aria-label', 'Table of Contents')

    // Check that all clickable elements are buttons or links
    const sectionButton = screen.getByText('1. God')
    expect(sectionButton).toHaveAttribute('type', 'button')
  })
})