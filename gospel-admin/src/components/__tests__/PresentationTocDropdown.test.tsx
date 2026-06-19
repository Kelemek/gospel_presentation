import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PresentationTocDropdown from '../PresentationTocDropdown'
import type { GospelSection } from '@/lib/types'

jest.mock('@/lib/scrollToTocAnchor', () => ({
  scrollToTocAnchor: jest.fn(() => true),
}))

const rowClassName = 'toc-row-class'

const mockSections: GospelSection[] = [
  {
    section: '1',
    title: 'God',
    subsections: [
      {
        title: 'A. God is Holy',
        content: 'Test',
        scriptureReferences: [],
      },
      {
        title: 'B. God is Love',
        content: 'Test',
        scriptureReferences: [],
        nestedSubsections: [
          {
            title: 'i. Definition of Holiness',
            content: 'Nested',
            scriptureReferences: [],
          },
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
        content: 'Test',
        scriptureReferences: [],
      },
    ],
  },
]

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /^Table of Contents$/ }))
}

async function expandSection(user: ReturnType<typeof userEvent.setup>, title: string) {
  await user.click(screen.getByRole('button', { name: new RegExp(`^Expand ${title}$`) }))
}

describe('PresentationTocDropdown', () => {
  it('renders Menu button and hides section links until opened', () => {
    render(
      <PresentationTocDropdown sections={mockSections} rowClassName={rowClassName} />
    )
    expect(screen.getByRole('button', { name: /^Table of Contents$/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'A. God is Holy' })).not.toBeInTheDocument()
  })

  it('returns null when sections are empty', () => {
    const { container } = render(
      <PresentationTocDropdown sections={[]} rowClassName={rowClassName} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('expands a section and shows subsection links', async () => {
    const user = userEvent.setup()
    render(
      <PresentationTocDropdown sections={mockSections} rowClassName={rowClassName} />
    )
    await openMenu(user)
    await expandSection(user, 'God')
    expect(screen.getByRole('link', { name: 'A. God is Holy' })).toHaveAttribute(
      'href',
      '#section-1-0'
    )
  })

  it('expands nested subsections under a subsection row', async () => {
    const user = userEvent.setup()
    render(
      <PresentationTocDropdown sections={mockSections} rowClassName={rowClassName} />
    )
    await openMenu(user)
    await expandSection(user, 'God')
    await expandSection(user, 'B. God is Love')
    expect(screen.getByRole('link', { name: 'i. Definition of Holiness' })).toHaveAttribute(
      'href',
      '#section-1-1-0'
    )
  })

  it('keeps the section title as a link when the section is expanded', async () => {
    const user = userEvent.setup()
    render(
      <PresentationTocDropdown sections={mockSections} rowClassName={rowClassName} />
    )
    await openMenu(user)
    await expandSection(user, 'God')
    expect(screen.getByRole('link', { name: 'God' })).toHaveAttribute('href', '#section-1')
  })

  it('keeps the subsection title as a link when nested items are expanded', async () => {
    const user = userEvent.setup()
    render(
      <PresentationTocDropdown sections={mockSections} rowClassName={rowClassName} />
    )
    await openMenu(user)
    await expandSection(user, 'God')
    await expandSection(user, 'B. God is Love')
    expect(screen.getByRole('link', { name: 'B. God is Love' })).toHaveAttribute(
      'href',
      '#section-1-1'
    )
  })

  it('navigates when a section link is clicked without using the expand control', async () => {
    const user = userEvent.setup()
    const onNavigate = jest.fn()
    render(
      <PresentationTocDropdown
        sections={mockSections}
        rowClassName={rowClassName}
        onNavigate={onNavigate}
      />
    )
    await openMenu(user)
    await user.click(screen.getByRole('link', { name: 'God' }))
    expect(onNavigate).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('link', { name: 'A. God is Holy' })).not.toBeInTheDocument()
  })

  it('renders a leaf link for sections without subsections', async () => {
    const user = userEvent.setup()
    render(
      <PresentationTocDropdown
        sections={[
          {
            section: '1',
            title: 'Introduction',
            subsections: [],
          },
        ]}
        rowClassName={rowClassName}
      />
    )
    await openMenu(user)
    expect(screen.getByRole('link', { name: 'Introduction' })).toHaveAttribute(
      'href',
      '#section-1'
    )
  })

  it('calls onNavigate when a subsection link is clicked', async () => {
    const user = userEvent.setup()
    const onNavigate = jest.fn()
    render(
      <PresentationTocDropdown
        sections={mockSections}
        rowClassName={rowClassName}
        onNavigate={onNavigate}
      />
    )
    await openMenu(user)
    await expandSection(user, 'God')
    await user.click(screen.getByRole('link', { name: 'A. God is Holy' }))
    expect(onNavigate).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('link', { name: 'A. God is Holy' })).not.toBeInTheDocument()
  })
})
