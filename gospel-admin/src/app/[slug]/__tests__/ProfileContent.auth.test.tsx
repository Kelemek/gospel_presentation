import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

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

jest.mock('@/components/ThemeToggle', () => ({ __esModule: true, default: () => null }))

jest.mock('@/components/BookmarksDropdown', () => ({ __esModule: true, default: () => null }))

beforeEach(() => {
  jest.clearAllMocks()
  // Basic fetch mock used for visit tracking in the component
  // @ts-expect-error mocking incompatible types
  global.fetch = jest.fn((url, opts) => Promise.resolve({ ok: true, json: async () => ({}) }))
})

test('slide-out menu shows Dashboard link when Supabase reports a logged-in admin', async () => {
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

  const user = userEvent.setup()
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

  await user.click(screen.getByRole('button', { name: 'Menu' }))
  const dashboard = await screen.findByRole('link', { name: /^Dashboard$/i })
  expect(dashboard).toHaveAttribute('href', '/admin')

  expect(screen.getByTestId('gospel-section')).toHaveTextContent('Intro')
})
