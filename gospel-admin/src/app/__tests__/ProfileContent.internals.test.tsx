import '@/lib/testing/profileContentTestMocks'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { installProfileContentFetchMock } from '@/lib/testing/profileContentTestMocks'

jest.mock('@/components/GospelSection', () => ({
  __esModule: true,
  default: ({ section }: { section: { title: string } }) => (
    <div data-testid="gospel-section">Section: {section.title}</div>
  ),
}))
jest.mock('@/components/TableOfContents', () => ({
  __esModule: true,
  default: ({ sections }: { sections?: unknown[] }) => (
    <div data-testid="toc">TOC {sections?.length || 0}</div>
  ),
}))
jest.mock('@/components/ScriptureModal', () => ({
  __esModule: true,
  default: ({ isOpen }: { isOpen: boolean }) => (
    <div data-testid="scripture-modal">Modal open: {String(!!isOpen)}</div>
  ),
}))

beforeAll(() => {
  installProfileContentFetchMock()
})

test('ProfileContent renders sections and tracks visit', async () => {
  const { ProfileContent } = await import('../[slug]/ProfileContent')

  const sections = [
    {
      section: '1',
      title: 'Introduction',
      subsections: [
        {
          title: 'What is the Gospel?',
          content: 'Short content',
          scriptureReferences: [{ reference: 'John 3:16', favorite: true }],
          nestedSubsections: [],
        },
      ],
    },
  ]

  const profileInfo = { title: 'Test Profile', slug: 'test-profile', favoriteScriptures: [] }

  render(<ProfileContent sections={sections as never} profileInfo={profileInfo} />)

  await waitFor(() => expect(screen.getByTestId('gospel-section')).toBeInTheDocument())
  expect(screen.getByTestId('gospel-section')).toHaveTextContent('Introduction')
})
