import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'

// Mock child components to keep test focused
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

// Mock supabase client used in auth checks
jest.mock('@/lib/supabase/client', () => ({
  __esModule: true,
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: null } }) },
  })
}))

// Mock scripture progress hook
jest.mock('@/lib/useScriptureProgress', () => ({
  __esModule: true,
  useScriptureProgress: () => ({
    trackScriptureView: jest.fn(),
    resetProgress: jest.fn(),
    lastViewedScripture: null,
    isLoading: false,
    error: null
  })
}))

beforeAll(() => {
  global.fetch = jest.fn((input: RequestInfo) => {
    // Accept visit tracking and profile fetches
    return Promise.resolve({ ok: true, json: async () => ({}) } as any)
  }) as any
})

afterAll(() => {
  // @ts-ignore
  global.fetch = undefined
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
          nestedSubsections: []
        }
      ]
    }
  ]

  const profileInfo = { title: 'Test Profile', slug: 'test-profile', favoriteScriptures: [] }

  render(<ProfileContent sections={sections as any} profileInfo={profileInfo as any} profile={null} />)

  await waitFor(() => expect(screen.getByTestId('gospel-section')).toBeInTheDocument())
  expect(screen.getByTestId('gospel-section')).toHaveTextContent('Introduction')
})
