import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock child components used by the page to keep the test focused and fast
jest.mock('@/components/GospelSection', () => ({
  __esModule: true,
  default: ({ section }: any) => <div data-testid="gospel-section">Section: {section.title}</div>
}))
jest.mock('@/components/TableOfContents', () => ({
  __esModule: true,
  default: ({ sections }: any) => <div data-testid="toc">TOC {sections?.length || 0}</div>
}))
jest.mock('@/components/ScriptureModal', () => ({
  __esModule: true,
  default: ({ isOpen }: any) => <div data-testid="scripture-modal">Modal open: {String(!!isOpen)}</div>
}))

// Provide a small fake gospel data payload
const fakeData = [
  {
    section: '1',
    title: 'Introduction',
    subsections: [
      {
        title: 'What is the Gospel?',
        content: 'Short content',
        scriptureReferences: [{ reference: 'John 3:16', favorite: true }]
      }
    ]
  },
]

beforeAll(() => {
  // Mock fetch for /api/data used by GospelPresentationOld
  global.fetch = jest.fn((input: RequestInfo) => {
    if (typeof input === 'string' && input.endsWith('/api/data')) {
      return Promise.resolve({ ok: true, json: async () => fakeData } as any)
    }
    return Promise.resolve({ ok: true, json: async () => ({}) } as any)
  }) as any
})

afterAll(() => {
  // @ts-ignore
  global.fetch = undefined
})

test('GospelPresentationOld loads data and renders sections', async () => {
  const { GospelPresentationOld } = await import('../page')

  render(<GospelPresentationOld />)

  // Wait for the GospelSection stub to appear
  await waitFor(() => expect(screen.getByTestId('gospel-section')).toBeInTheDocument())
  expect(screen.getByTestId('gospel-section')).toHaveTextContent('Introduction')
  // Open the Table of Contents menu and assert the mocked TOC is rendered
  const tocButton = screen.getByRole('button', { name: /table of contents/i })
  await userEvent.click(tocButton)
  await waitFor(() => expect(screen.getByTestId('toc')).toBeInTheDocument())
  expect(screen.getByTestId('toc')).toHaveTextContent('TOC 1')
})
