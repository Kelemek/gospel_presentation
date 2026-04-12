import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TextSizeProvider } from '@/contexts/TextSizeContext'
import SidebarAuthNav from '@/components/SidebarAuthNav'

function renderToc(ui: React.ReactElement) {
  return render(<TextSizeProvider>{ui}</TextSizeProvider>)
}

// Mock Next.js router like the primary TableOfContents tests do
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

describe('TableOfContents additional behaviors', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('calls window.print when Print Version is clicked', async () => {
    const mockPrint = jest.fn()
    const printSpy = jest.spyOn(window, 'print').mockImplementation(mockPrint)

    // Import the component (router is mocked above) and render
    // require here so module uses the same cached React instance as the test harness
    const TableOfContents = require('../TableOfContents').default
    renderToc(<TableOfContents sections={[]} />)

    const printButton = screen.getByText(/Print Version/i)
    fireEvent.click(printButton)

    expect(mockPrint).toHaveBeenCalled()
    printSpy.mockRestore()
  })

  it('shows Resources dropdown when user is not logged in', async () => {
    const clientMod = require('@/lib/supabase/client')
    jest.spyOn(clientMod, 'createClient').mockImplementation(() => ({
      auth: { getUser: async () => ({ data: { user: null } }) }
    }))

    const fetchSpy = jest.fn((input: RequestInfo | URL) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : (input as Request).url
      if (String(url).includes('/api/profiles/public-templates')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            items: [{ type: 'template', slug: 't1', title: 'Template One' }]
          })
        }) as any
      }
      return Promise.resolve({ ok: false }) as any
    })
    global.fetch = fetchSpy as typeof fetch

    const TableOfContents = require('../TableOfContents').default
    renderToc(<TableOfContents sections={[]} />)

    await waitFor(() => expect(screen.getByText(/Resources/i)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /Resources/i })).toBeInTheDocument()
  })

  it('shows category in Resources and expands to show template links', async () => {
    const clientMod = require('@/lib/supabase/client')
    jest.spyOn(clientMod, 'createClient').mockImplementation(() => ({
      auth: { getUser: async () => ({ data: { user: null } }) }
    }))

    const fetchSpy = jest.fn((input: RequestInfo | URL) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : (input as Request).url
      if (String(url).includes('/api/profiles/public-templates')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            items: [
              {
                type: 'category',
                id: 'cat-1',
                name: 'My Category',
                templates: [{ slug: 'inner', title: 'Inner Template' }]
              }
            ]
          })
        }) as any
      }
      return Promise.resolve({ ok: false }) as any
    })
    global.fetch = fetchSpy as typeof fetch

    const TableOfContents = require('../TableOfContents').default
    renderToc(<TableOfContents sections={[]} />)

    await waitFor(() => expect(screen.getByRole('button', { name: /Resources/i })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Resources/i }))

    await waitFor(() => expect(screen.getByRole('button', { name: /My Category/i })).toBeInTheDocument())
    expect(screen.queryByRole('link', { name: /Inner Template/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /My Category/i }))
    await waitFor(() => expect(screen.getByRole('link', { name: /Inner Template/i })).toBeInTheDocument())
    expect(screen.getByRole('link', { name: /Inner Template/i })).toHaveAttribute('href', '/inner')
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
    renderToc(
      <>
        <TableOfContents sections={[]} />
        <SidebarAuthNav />
      </>
    )

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument()
    })

    const link = screen.getByRole('link', { name: /Dashboard/i })
    expect(link).toHaveAttribute('href', '/admin')

    const resources = screen.getByRole('button', { name: /Resources/i })
    expect(
      resources.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it('Text size dropdown opens and saves Larger to localStorage', async () => {
    const clientMod = require('@/lib/supabase/client')
    jest.spyOn(clientMod, 'createClient').mockImplementation(() => ({
      auth: { getUser: async () => ({ data: { user: null } }) }
    }))
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as typeof fetch

    const TableOfContents = require('../TableOfContents').default
    localStorage.removeItem('gospel-profile-text-size')
    renderToc(<TableOfContents sections={[]} />)

    fireEvent.click(screen.getByRole('button', { name: /Text size/i }))
    fireEvent.click(screen.getByRole('option', { name: /^Larger$/i }))
    expect(localStorage.getItem('gospel-profile-text-size')).toBe('larger')
  })

  it('Bible translation list opens and setTranslation is called when an option is chosen', () => {
    const TableOfContents = require('../TableOfContents').default
    const { useTranslation } = require('@/contexts/TranslationContext')
    const setTranslation = useTranslation().setTranslation
    setTranslation.mockClear()

    renderToc(<TableOfContents sections={[]} />)

    fireEvent.click(screen.getByRole('button', { name: /Bible Translation/i }))
    fireEvent.click(screen.getByRole('option', { name: /KJV \(King James Version\)/i }))
    expect(setTranslation).toHaveBeenCalledWith('kjv')
  })
})
