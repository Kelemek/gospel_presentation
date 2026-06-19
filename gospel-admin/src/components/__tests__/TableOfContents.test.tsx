import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TableOfContents from '../TableOfContents'
import { GospelSection } from '@/lib/types'
import { TextSizeProvider } from '@/contexts/TextSizeContext'

function renderToc(ui: React.ReactElement) {
  return render(<TextSizeProvider>{ui}</TextSizeProvider>)
}

jest.mock('@/lib/scrollToTocAnchor', () => ({
  scrollToTocAnchor: jest.fn(() => true),
}))

// Mock Next.js router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock Capacitor so Print button is visible in tests (hidden on Android only)
jest.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => 'web',
    isNativePlatform: () => false,
  },
}))

jest.mock('@capgo/capacitor-printer', () => ({
  Printer: { printWebView: jest.fn().mockResolvedValue(undefined) },
}))

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
  writable: true,
})

async function openPresentationMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /^Table of Contents$/ }))
}

async function expandSection(user: ReturnType<typeof userEvent.setup>, title: string) {
  await user.click(screen.getByRole('button', { name: new RegExp(`^Expand ${title}$`) }))
}

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
            { reference: 'Isaiah 6:3', favorite: true },
          ],
        },
        {
          title: 'B. God is Love',
          content: 'Test content',
          scriptureReferences: [
            { reference: '1 John 4:8', favorite: false },
          ],
        },
      ],
    },
    {
      section: '2',
      title: 'Man',
      subsections: [
        {
          title: 'A. Man is Sinful',
          content: 'Test content',
          scriptureReferences: [
            { reference: 'Romans 3:23', favorite: true },
          ],
        },
      ],
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render sections and subsections inside Menu dropdown', async () => {
    const user = userEvent.setup()
    renderToc(<TableOfContents sections={mockSections} />)

    expect(screen.getByRole('button', { name: /^Table of Contents$/ })).toBeInTheDocument()
    expect(screen.queryByText('A. God is Holy')).not.toBeInTheDocument()

    await openPresentationMenu(user)
    await expandSection(user, 'God')

    expect(screen.getByText('A. God is Holy')).toBeInTheDocument()
    expect(screen.getByText('B. God is Love')).toBeInTheDocument()

    await expandSection(user, 'Man')
    expect(screen.getByText('A. Man is Sinful')).toBeInTheDocument()
  })

  it('should handle section clicks when the section has no subsections', async () => {
    const user = userEvent.setup()
    renderToc(
      <TableOfContents
        sections={[
          {
            section: '1',
            title: 'Introduction',
            subsections: [],
          },
        ]}
      />
    )

    await openPresentationMenu(user)
    const sectionLink = screen.getByRole('link', { name: 'Introduction' })
    expect(sectionLink).toHaveAttribute('href', '#section-1')
  })

  it('should handle subsection clicks and scroll to subsection', async () => {
    const user = userEvent.setup()
    renderToc(<TableOfContents sections={mockSections} />)

    await openPresentationMenu(user)
    await expandSection(user, 'God')
    const subsectionLink = screen.getByRole('link', { name: 'A. God is Holy' })
    expect(subsectionLink).toHaveAttribute('href', '#section-1-0')
  })

  it('should handle missing DOM elements gracefully', async () => {
    const user = userEvent.setup()
    renderToc(<TableOfContents sections={mockSections} />)

    await openPresentationMenu(user)
    await expandSection(user, 'God')
    const subsectionLink = screen.getByRole('link', { name: 'A. God is Holy' })
    expect(() => fireEvent.click(subsectionLink)).not.toThrow()
  })

  it('should render nested subsections (level 3) if present', async () => {
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
                  { reference: 'Leviticus 11:44', favorite: false },
                ],
              },
            ],
          },
        ],
      },
    ]

    const user = userEvent.setup()
    renderToc(<TableOfContents sections={sectionsWithNested} />)

    await openPresentationMenu(user)
    await expandSection(user, 'God')
    await expandSection(user, 'A. God is Holy')

    const nestedLink = screen.getByRole('link', { name: 'i. Definition of Holiness' })
    expect(nestedLink).toHaveAttribute('href', '#section-1-0-0')
  })

  it('should apply correct styling classes on Menu button', () => {
    const { container } = renderToc(<TableOfContents sections={mockSections} />)

    const tocContainer = container.firstChild as HTMLElement
    expect(tocContainer).toHaveClass('space-y-4')

    const tocButton = screen.getByRole('button', { name: /^Table of Contents$/ })
    expect(tocButton).toHaveClass('rounded-lg')
  })

  it('should hide Menu when sections array is empty', () => {
    const { container } = renderToc(<TableOfContents sections={[]} />)

    const tocContainer = container.firstChild as HTMLElement
    expect(tocContainer).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Table of Contents$/ })).not.toBeInTheDocument()
    expect(screen.getByText(/Print/i)).toBeInTheDocument()
  })

  it('should render subsection links as anchors inside Menu', async () => {
    const user = userEvent.setup()
    renderToc(<TableOfContents sections={mockSections} />)

    await openPresentationMenu(user)
    await expandSection(user, 'God')
    const subsectionLink = screen.getByRole('link', { name: 'A. God is Holy' })
    expect(subsectionLink.tagName).toBe('A')
  })
})
