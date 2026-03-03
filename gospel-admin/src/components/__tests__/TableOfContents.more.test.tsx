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
    // @ts-expect-error mocking incompatible types
    window.print = mockPrint

    // Import the component (router is mocked above) and render
    // require here so module uses the same cached React instance as the test harness
    const TableOfContents = require('../TableOfContents').default
    render(<TableOfContents sections={[]} />)

    const printButton = screen.getByText(/Print Version/i)
    fireEvent.click(printButton)

    expect(mockPrint).toHaveBeenCalled()
  })

  it('shows Resources dropdown when user is not logged in', async () => {
    const clientMod = require('@/lib/supabase/client')
    jest.spyOn(clientMod, 'createClient').mockImplementation(() => ({
      auth: { getUser: async () => ({ data: { user: null } }) }
    }))

    const fetchSpy = jest.fn((input: RequestInfo) => {
      const url = typeof input === 'string' ? input : (input as Request).url
      if (String(url).includes('/api/profiles/public-templates')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ profiles: [{ slug: 't1', title: 'Template One' }] })
        }) as any
      }
      return Promise.resolve({ ok: false }) as any
    })
    global.fetch = fetchSpy

    const TableOfContents = require('../TableOfContents').default
    render(<TableOfContents sections={[]} />)

    await waitFor(() => expect(screen.getByText(/Resources/i)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /Resources/i })).toBeInTheDocument()
  })

  it('renders Dashboard link when user is logged in', async () => {
    const clientMod = require('@/lib/supabase/client')
    jest.spyOn(clientMod, 'createClient').mockImplementation(() => ({
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) }
    }))

    ;(global as any).localStorage = {
      getItem: jest.fn((k: string) => (k === 'gospel-admin-auth' ? JSON.stringify({ isAuthenticated: true, sessionToken: 't' }) : null)),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    }

    const TableOfContents = require('../TableOfContents').default
    render(<TableOfContents sections={[]} />)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument()
    })

    const link = screen.getByRole('link', { name: /Dashboard/i })
    expect(link).toHaveAttribute('href', '/admin')
  })
})
