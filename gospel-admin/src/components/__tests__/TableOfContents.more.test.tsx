import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { TextSizeProvider } from '@/contexts/TextSizeContext'
import SidebarAuthNav from '@/components/SidebarAuthNav'
import { gospelStorageSetSync } from '@/lib/gospelClientStorage'
import {
  PROFILE_LAST_OPEN_RESOURCE_STORAGE_KEY,
  resetProfileLastOpenNavigationRefsForTests,
} from '@/lib/profileLastOpenResourceStorage'
import { installTestLocalStorage } from '@/lib/testing/testLocalStorage'

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
    installTestLocalStorage()
    resetProfileLastOpenNavigationRefsForTests()
  })

  function mockLoggedOutResourcesFetch() {
    const clientMod = require('@/lib/supabase/client')
    jest.spyOn(clientMod, 'createClient').mockImplementation(() => ({
      auth: { getUser: async () => ({ data: { user: null } }) },
    }))
    global.fetch = jest.fn(async (input: RequestInfo | URL): Promise<Response> => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : (input as Request).url
      if (String(url).includes('/api/profiles/public-templates')) {
        return {
          ok: true,
          json: async () => ({ items: [] }),
        } as Response
      }
      return { ok: false } as Response
    }) as jest.MockedFunction<typeof fetch>
  }

  it('shows Last Open dropdown above Resources when other recent resources exist', async () => {
    mockLoggedOutResourcesFetch()
    gospelStorageSetSync(
      PROFILE_LAST_OPEN_RESOURCE_STORAGE_KEY,
      JSON.stringify({
        v: 2,
        resources: [
          { slug: 'other', title: 'Current' },
          { slug: 'default', title: 'The Gospel Presentation' },
        ],
      })
    )

    const TableOfContents = require('../TableOfContents').default
    renderToc(<TableOfContents sections={[]} currentProfileSlug="other" />)

    await waitFor(() => expect(screen.getByRole('button', { name: /Resources/i })).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /^History$/i })).toBeInTheDocument()
  })

  it('hides Last Open when only the current profile is in recent list', async () => {
    mockLoggedOutResourcesFetch()
    gospelStorageSetSync(
      PROFILE_LAST_OPEN_RESOURCE_STORAGE_KEY,
      JSON.stringify({
        v: 2,
        resources: [{ slug: 'default', title: 'The Gospel Presentation' }],
      })
    )

    const TableOfContents = require('../TableOfContents').default
    renderToc(<TableOfContents sections={[]} currentProfileSlug="default" />)

    await waitFor(() => expect(screen.getByRole('button', { name: /Resources/i })).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /^History$/i })).not.toBeInTheDocument()
  })

  it('lists up to five recent resources and navigates on row click', async () => {
    mockLoggedOutResourcesFetch()
    gospelStorageSetSync(
      PROFILE_LAST_OPEN_RESOURCE_STORAGE_KEY,
      JSON.stringify({
        v: 2,
        resources: [
          { slug: 'current', title: 'Current' },
          { slug: 'r1', title: 'Resource One' },
          { slug: 'r2', title: 'Resource Two' },
          { slug: 'default', title: 'The Gospel' },
        ],
      })
    )
    const onNavigate = jest.fn()

    const TableOfContents = require('../TableOfContents').default
    renderToc(
      <TableOfContents sections={[]} currentProfileSlug="current" onNavigate={onNavigate} />
    )

    await waitFor(() => expect(screen.getByRole('button', { name: /^History$/i })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /^History$/i }))

    expect(screen.getByRole('link', { name: 'Resource One' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'The Gospel' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Current' })).not.toBeInTheDocument()

    const gospelLink = screen.getByRole('link', { name: 'The Gospel' })
    expect(gospelLink).toHaveAttribute('href', '/default')
    fireEvent.click(gospelLink)
    expect(onNavigate).toHaveBeenCalled()
  })

  it('shows Last Open with Scriptures section when only scriptures are stored', async () => {
    mockLoggedOutResourcesFetch()
    gospelStorageSetSync(
      PROFILE_LAST_OPEN_RESOURCE_STORAGE_KEY,
      JSON.stringify({
        v: 3,
        resources: [{ slug: 'default', title: 'The Gospel Presentation' }],
        scriptures: [
          {
            slug: 'default',
            profileTitle: 'The Gospel Presentation',
            reference: 'John 3:16',
            sectionId: 'section-1',
            subsectionId: 'section-1-0',
            translation: 'esv',
            openedAt: 1,
          },
        ],
      })
    )

    const TableOfContents = require('../TableOfContents').default
    renderToc(<TableOfContents sections={[]} currentProfileSlug="default" />)

    await waitFor(() => expect(screen.getByRole('button', { name: /^History$/i })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /^History$/i }))

    const panel = screen.getByRole('list')
    expect(within(panel).getByText('Scriptures')).toBeInTheDocument()
    expect(within(panel).queryByText('Resources')).not.toBeInTheDocument()
    const scriptureLink = within(panel).getByRole('link', { name: /John 3:16 · ESV/i })
    expect(scriptureLink).toHaveAttribute('href', '/default?scriptureRef=John+3%3A16&translation=esv')
  })

  it('renders Resources and Scriptures sections with scripture chapter href', async () => {
    mockLoggedOutResourcesFetch()
    gospelStorageSetSync(
      PROFILE_LAST_OPEN_RESOURCE_STORAGE_KEY,
      JSON.stringify({
        v: 3,
        resources: [
          { slug: 'current', title: 'Current' },
          { slug: 'sg', title: 'Spurgeon' },
        ],
        scriptures: [
          {
            slug: 'sg',
            profileTitle: 'Spurgeon',
            reference: 'Romans 8:1',
            sectionId: 'section-2',
            subsectionId: 'section-2-0',
            chapterView: true,
            openedAt: 2,
          },
        ],
      })
    )

    const TableOfContents = require('../TableOfContents').default
    renderToc(<TableOfContents sections={[]} currentProfileSlug="current" />)

    await waitFor(() => expect(screen.getByRole('button', { name: /^History$/i })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /^History$/i }))

    const panel = screen.getByRole('list')
    expect(within(panel).getByText('Resources')).toBeInTheDocument()
    expect(within(panel).getByText('Scriptures')).toBeInTheDocument()
    expect(within(panel).getByRole('link', { name: 'Spurgeon' })).toHaveAttribute('href', '/sg')
    expect(within(panel).getByRole('link', { name: /Romans 8:1/i })).toHaveAttribute(
      'href',
      '/sg?scriptureRef=Romans+8%3A1&scriptureView=chapter'
    )
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
                children: [{ type: 'template', slug: 'inner', title: 'Inner Template' }]
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

  it('applies font-extrabold to category template link when slug is in read-complete storage', async () => {
    const { PRESENTATION_READ_COMPLETE_STORAGE_KEY } = require('@/lib/presentationReadCompleteStorage')
    localStorage.setItem(PRESENTATION_READ_COMPLETE_STORAGE_KEY, JSON.stringify({ v: 1, slugs: ['inner'] }))

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
                children: [{ type: 'template', slug: 'inner', title: 'Inner Template' }]
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
    fireEvent.click(screen.getByRole('button', { name: /My Category/i }))
    await waitFor(() => expect(screen.getByRole('link', { name: /Inner Template/i })).toBeInTheDocument())

    const link = screen.getByRole('link', { name: /Inner Template/i })
    expect(link.className).toMatch(/font-extrabold/)
    localStorage.removeItem(PRESENTATION_READ_COMPLETE_STORAGE_KEY)
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
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false } as Response) as jest.MockedFunction<typeof fetch>

    const TableOfContents = require('../TableOfContents').default
    localStorage.removeItem('gospel-profile-text-size')
    renderToc(<TableOfContents sections={[]} />)

    fireEvent.click(screen.getByRole('button', { name: /Text size/i }))
    fireEvent.click(screen.getByRole('option', { name: /^Larger$/i }))
    expect(localStorage.getItem('gospel-profile-text-size')).toBe('larger')
  })

  it('opens M\'Cheyne calendar via button instead of direct link', async () => {
    const onOpenMcheynePlan = jest.fn()
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
              { type: 'template', slug: 'mchy', title: "M'Cheyne Bible Reading Plan" },
              { type: 'template', slug: 't1', title: 'Template One' },
            ]
          })
        }) as any
      }
      return Promise.resolve({ ok: false }) as any
    })
    global.fetch = fetchSpy as typeof fetch

    const TableOfContents = require('../TableOfContents').default
    renderToc(<TableOfContents sections={[]} onOpenMcheynePlan={onOpenMcheynePlan} />)

    await waitFor(() => expect(screen.getByRole('button', { name: /Resources/i })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Resources/i }))

    const mchyButton = await screen.findByRole('button', { name: /M'Cheyne Bible Reading Plan/i })
    expect(screen.queryByRole('link', { name: /M'Cheyne Bible Reading Plan/i })).not.toBeInTheDocument()
    expect(mchyButton.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument()
    fireEvent.click(mchyButton)
    expect(onOpenMcheynePlan).toHaveBeenCalledTimes(1)

    const plainLink = screen.getByRole('link', { name: /Template One/i })
    expect(plainLink).toHaveAttribute('href', '/t1')
    expect(plainLink.querySelector('svg[aria-hidden="true"]')).not.toBeInTheDocument()
  })

  it('shows Bible Reader main menu button immediately and calls onOpenBibleReader', async () => {
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
            items: [{ type: 'bibleReader', title: 'Bible Reader' }],
          }),
        }) as any
      }
      return Promise.resolve({ ok: false }) as any
    })
    global.fetch = fetchSpy as typeof fetch

    const onOpenBibleReader = jest.fn()
    const TableOfContents = require('../TableOfContents').default
    renderToc(<TableOfContents sections={[]} onOpenBibleReader={onOpenBibleReader} />)

    const bibleReader = screen.getByRole('button', { name: /Bible Reader/i })
    expect(screen.getByRole('button', { name: /Resources/i })).toBeInTheDocument()
    fireEvent.click(bibleReader)
    expect(onOpenBibleReader).toHaveBeenCalledTimes(1)
  })

  it('hides Bible Reader after public-templates fetch when not in admin order', async () => {
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
            items: [{ type: 'template', slug: 't1', title: 'Template One' }],
          }),
        }) as any
      }
      return Promise.resolve({ ok: false }) as any
    })
    global.fetch = fetchSpy as typeof fetch

    const TableOfContents = require('../TableOfContents').default
    renderToc(<TableOfContents sections={[]} onOpenBibleReader={jest.fn()} />)

    expect(screen.getByRole('button', { name: /Bible Reader/i })).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /Bible Reader/i })).not.toBeInTheDocument()
    )
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
