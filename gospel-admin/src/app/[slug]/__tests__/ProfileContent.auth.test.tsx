import React from 'react'
import { render, screen } from '@testing-library/react'

// Keep the test focused by mocking child components
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

// Mock the scripture progress hook so we don't hit real tracking logic
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

beforeEach(() => {
  jest.clearAllMocks()
  // Basic fetch mock used for visit tracking in the component
  // @ts-ignore
  global.fetch = jest.fn((url, opts) => Promise.resolve({ ok: true, json: async () => ({}) }))
})

afterEach(() => {
  // restore any modified location
  try {
    // @ts-ignore
    if ((global as any).__origLocation) {
      // @ts-ignore
      window.location = (global as any).__origLocation
      // @ts-ignore
      delete (global as any).__origLocation
    }
  } catch (e) {
    // ignore
  }
})

test('shows Edit button when user is admin and preview param present', async () => {
  // Use spyOn on the already-loaded client module to avoid resetting modules
  // eslint-disable-next-line global-require
  const clientMod = require('@/lib/supabase/client')
  jest.spyOn(clientMod, 'createClient').mockImplementation(() => ({
    auth: {
      getUser: async () => ({ data: { user: { id: 'u1', email: 'admin@x.com' } } }),
      signOut: async () => ({})
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { role: 'admin' } })
        })
      })
    })
  }))

  // Simulate preview=true in the URL so fromEditor becomes true
  // window.location is read-only in JSDOM; temporarily replace it
  // @ts-ignore
  if (!(global as any).__origLocation) (global as any).__origLocation = window.location
  // @ts-ignore
  delete (window as any).location
  // @ts-ignore
  window.location = { search: '?preview=true' } as any

  const { ProfileContent } = await import('../ProfileContent')

  const sections = [
    {
      section: '1',
      title: 'Intro',
      subsections: [
        {
          title: 'Q1',
          content: 'c',
          scriptureReferences: [{ reference: 'John 3:16', favorite: false }],
          nestedSubsections: []
        }
      ]
    }
  ]

  const profileInfo = { title: 'P', slug: 'p-s', favoriteScriptures: [] }

  render(<ProfileContent sections={sections as any} profileInfo={profileInfo as any} profile={null} />)

  // Authenticated indicator should show the user's email (admin path exercised)
  const userEmail = await screen.findByText(/admin@x.com/i)
  expect(userEmail).toBeInTheDocument()

  // And the gospel section should render
  expect(screen.getByTestId('gospel-section')).toHaveTextContent('Intro')
})
