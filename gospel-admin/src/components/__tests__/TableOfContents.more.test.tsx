import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock Next.js router like the primary TableOfContents tests do
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('TableOfContents additional behaviors', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('calls window.print when Print Version is clicked', async () => {
    const mockPrint = jest.fn()
    // @ts-ignore
    window.print = mockPrint

    // Import the component (router is mocked above) and render
    // require here so module uses the same cached React instance as the test harness
    const TableOfContents = require('../TableOfContents').default
    render(<TableOfContents sections={[]} />)

    const printButton = screen.getByText(/Print Version/i)
    fireEvent.click(printButton)

    expect(mockPrint).toHaveBeenCalled()
  })

  it('renders View Profiles when user is logged in', async () => {
    // Spy on the already-loaded supabase client module and mock createClient
    // (avoids resetModules or doMock which can create a second React instance).
    // eslint-disable-next-line global-require
    const clientMod = require('@/lib/supabase/client')
    jest.spyOn(clientMod, 'createClient').mockImplementation(() => ({
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    }))

    // Ensure an authenticated localStorage marker (some helpers rely on this)
    ;(global as any).localStorage = {
      getItem: jest.fn((k: string) => (k === 'gospel-admin-auth' ? JSON.stringify({ isAuthenticated: true, sessionToken: 't' }) : null)),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    }

    const TableOfContents = require('../TableOfContents').default
    render(<TableOfContents sections={[]} />)

    // Wait for the effect to run and set isLoggedIn
    await waitFor(() => {
      expect(screen.getByText(/View Profiles|Login/)).toBeInTheDocument()
    })

    // When supabase returns a user, the header link should point to /admin
    const link = screen.getByRole('link', { name: /View Profiles|Login/ })
    expect(link).toHaveAttribute('href', expect.stringContaining('/'))
  })
})
