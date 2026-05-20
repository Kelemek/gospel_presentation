import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { MouseEvent, ReactNode } from 'react'
import { PRESENTATION_READ_COMPLETE_STORAGE_KEY } from '@/lib/presentationReadCompleteStorage'
import SpurgeonSermonsModal from '../SpurgeonSermonsModal'

jest.mock('next/link', () => {
  return function MockLink({
    children,
    href,
    onClick,
    ...rest
  }: {
    children: ReactNode
    href: string
    onClick?: (e: MouseEvent<HTMLAnchorElement>) => void
  } & Record<string, unknown>) {
    return (
      <a
        href={href}
        {...rest}
        onClick={(e) => {
          e.preventDefault()
          onClick?.(e)
        }}
      >
        {children}
      </a>
    )
  }
})

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

function mockByReferenceFetch(
  items: { slug: string; title: string }[],
  morneveItems: { slug: string; title: string }[] = [],
  calvinItems: { slug: string; title: string }[] = []
) {
  return (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.toString()
    if (url.includes('/api/morneve/by-reference')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items: morneveItems }),
      } as Response)
    }
    if (url.includes('/api/calvin/by-reference')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items: calvinItems }),
      } as Response)
    }
    if (url.includes('/api/spurgeon/by-reference')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items }),
      } as Response)
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ items: [], total: 0, page: 1, pageSize: 100 }),
    } as Response)
  }
}

function emptyPagedResponse(): Response {
  return {
    ok: true,
    json: () => Promise.resolve({ items: [], total: 0, page: 1, pageSize: 100 }),
  } as Response
}

describe('SpurgeonSermonsModal', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockFetch.mockImplementation((input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.toString()
      if (url.includes('/api/calvin/') || url.includes('/api/spurgeon/sermons')) {
        return Promise.resolve(emptyPagedResponse())
      }
      return Promise.resolve(emptyPagedResponse())
    })
  })

  it('renders nothing when closed', () => {
    const { container } = render(<SpurgeonSermonsModal isOpen={false} onClose={jest.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('loads sermons when opened on search tab', async () => {
    render(<SpurgeonSermonsModal isOpen onClose={jest.fn()} />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/spurgeon\/sermons\?[^]*page=1[^]*pageSize=100/),
        expect.any(Object)
      )
    })
    expect(screen.getByRole('heading', { name: /Study resources/i })).toBeInTheDocument()
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/calvin\/books\?/),
      expect.any(Object)
    )
  })

  it('switches to by scripture tab and runs lookup after debounced typing', async () => {
    const user = userEvent.setup()
    mockFetch.mockImplementation(
      mockByReferenceFetch([{ slug: 'sg00001', title: 'Test Sermon' }])
    )

    render(<SpurgeonSermonsModal isOpen onClose={jest.fn()} />)

    await user.click(screen.getByRole('button', { name: /By scripture/i }))
    await user.type(screen.getByLabelText(/Scripture reference/i), 'John 3:16')

    await waitFor(
      () => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/spurgeon/by-reference?reference='),
          expect.any(Object)
        )
      },
      { timeout: 5000 }
    )
    expect(await screen.findByRole('link', { name: /Test Sermon/i })).toHaveAttribute('href', '/sg00001')
    expect(screen.queryByRole('button', { name: /Find sermons/i })).not.toBeInTheDocument()
  })

  it('opens By scripture with initialByReference and runs lookup', async () => {
    mockFetch.mockImplementation(
      mockByReferenceFetch([{ slug: 'sg00002', title: 'From Initial Ref' }])
    )

    render(
      <SpurgeonSermonsModal
        isOpen
        onClose={jest.fn()}
        initialByReference="Romans 8:28"
      />
    )

    await waitFor(
      () => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringMatching(/\/api\/spurgeon\/by-reference\?reference=/),
          expect.any(Object)
        )
      },
      { timeout: 5000 }
    )
    expect(await screen.findByRole('link', { name: /From Initial Ref/i })).toHaveAttribute('href', '/sg00002')
  })

  it('shows Calvin commentaries section on By scripture when calvin by-reference returns hits', async () => {
    const user = userEvent.setup()
    mockFetch.mockImplementation(
      mockByReferenceFetch([], [], [{ slug: 'cvrom', title: 'Calvin on Romans' }])
    )

    render(<SpurgeonSermonsModal isOpen onClose={jest.fn()} />)

    await user.click(screen.getByRole('button', { name: /By scripture/i }))
    await user.type(screen.getByLabelText(/Scripture reference/i), 'Romans 8:28')

    expect(await screen.findByRole('heading', { name: /Calvin commentaries/i })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /Calvin on Romans/i })).toHaveAttribute('href', '/cvrom')
  })

  it('with libraryFocus calvin only fetches Calvin books on search, not sermons', async () => {
    render(<SpurgeonSermonsModal isOpen onClose={jest.fn()} libraryFocus="calvin" />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/calvin\/books\?/),
        expect.any(Object)
      )
    })
    expect(
      mockFetch.mock.calls.some((c) => String(c[0]).includes('/api/spurgeon/sermons'))
    ).toBe(false)
    expect(screen.queryByRole('heading', { name: /^Spurgeon Sermons$/i })).not.toBeInTheDocument()
  })

  it('shows per-collection pagination ranges when sermon and Calvin page counts differ', async () => {
    const user = userEvent.setup()

    mockFetch.mockImplementation((input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.toString()
      const page = Number(new URL(url, 'http://localhost').searchParams.get('page') || '1')

      if (url.includes('/api/calvin/books')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              items: [{ slug: 'cvrom', title: 'Calvin on Romans' }],
              total: 150,
              page,
              pageSize: 100,
            }),
        } as Response)
      }
      if (url.includes('/api/spurgeon/sermons')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              items: page === 1 ? [{ slug: 'sg00001', title: 'Sermon 1. Grace' }] : [],
              total: 50,
              page,
              pageSize: 100,
            }),
        } as Response)
      }
      return Promise.resolve(emptyPagedResponse())
    })

    render(<SpurgeonSermonsModal isOpen onClose={jest.fn()} libraryFocus="all" />)

    const footer = await screen.findByLabelText(/Study search pagination/i)
    expect(footer).toHaveTextContent('Sermons 1–50 of 50')
    expect(footer).toHaveTextContent('Calvin 1–100 of 150')
    expect(footer).toHaveTextContent('Page 1 of 2')

    await user.click(screen.getByRole('button', { name: /^Next$/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/Study search pagination/i)).toHaveTextContent('Calvin 101–150 of 150')
    })
    const page2Footer = screen.getByLabelText(/Study search pagination/i)
    expect(page2Footer).not.toHaveTextContent('Sermons')
    expect(page2Footer).toHaveTextContent('Page 2 of 2')
  })

  it('shows Calvin books in keyword search alongside sermons', async () => {
    mockFetch.mockImplementation((input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.toString()
      if (url.includes('/api/calvin/books')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              items: [{ slug: 'cvgen', title: 'Calvin on Genesis' }],
              total: 1,
              page: 1,
              pageSize: 100,
            }),
        } as Response)
      }
      if (url.includes('/api/spurgeon/sermons')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              items: [{ slug: 'sg00001', title: 'Sermon 1. Grace' }],
              total: 1,
              page: 1,
              pageSize: 100,
            }),
        } as Response)
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items: [], total: 0, page: 1, pageSize: 100 }),
      } as Response)
    })

    render(<SpurgeonSermonsModal isOpen onClose={jest.fn()} />)

    expect(await screen.findByRole('heading', { name: /^Spurgeon Sermons$/i })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: /Calvin commentaries/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^Grace$/i })).toHaveAttribute('href', '/sg00001')
    expect(screen.getByRole('link', { name: /Calvin on Genesis/i })).toHaveAttribute('href', '/cvgen')
  })

  it('shows sermon title without leading Sermon N. catalog prefix in search results', async () => {
    mockFetch.mockImplementation((input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.toString()
      if (url.includes('/api/spurgeon/sermons')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              items: [{ slug: 'sg00042', title: 'Sermon 42. Grace Abounding' }],
              total: 1,
              page: 1,
              pageSize: 100,
            }),
        } as Response)
      }
      if (url.includes('/api/calvin/books')) {
        return Promise.resolve(emptyPagedResponse())
      }
      return Promise.resolve(emptyPagedResponse())
    })

    render(<SpurgeonSermonsModal isOpen onClose={jest.fn()} />)

    expect(await screen.findByRole('link', { name: /^Grace Abounding$/i })).toHaveAttribute('href', '/sg00042')
    expect(screen.queryByRole('link', { name: /Sermon 42/i })).not.toBeInTheDocument()
  })

  it('loads By read tab from read-complete Spurgeon slugs', async () => {
    const user = userEvent.setup()
    localStorage.setItem(
      PRESENTATION_READ_COMPLETE_STORAGE_KEY,
      JSON.stringify({ v: 1, slugs: ['sg00001', 'default'] })
    )

    mockFetch.mockImplementation((input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.toString()
      if (url.includes('/api/spurgeon/by-slugs')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: [{ slug: 'sg00001', title: 'Sermon 1. Read One Title' }] }),
        } as Response)
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items: [], total: 0, page: 1, pageSize: 100 }),
      } as Response)
    })

    render(<SpurgeonSermonsModal isOpen onClose={jest.fn()} />)

    await user.click(screen.getByRole('button', { name: /^By read$/i }))
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/spurgeon\/by-slugs\?slugs=/),
        expect.any(Object)
      )
    })
    expect(await screen.findByRole('link', { name: /Read One Title/i })).toHaveAttribute('href', '/sg00001')
    localStorage.removeItem(PRESENTATION_READ_COMPLETE_STORAGE_KEY)
  })

  it('calls onFollowSermonLink and onClose when following a sermon link from search', async () => {
    const user = userEvent.setup()
    const onFollowSermonLink = jest.fn()
    const onClose = jest.fn()
    mockFetch.mockImplementation((input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.toString()
      if (url.includes('/api/spurgeon/sermons')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              items: [{ slug: 'sg00999', title: 'Follow This Sermon' }],
              total: 1,
              page: 1,
              pageSize: 100,
            }),
        } as Response)
      }
      if (url.includes('/api/calvin/books')) {
        return Promise.resolve(emptyPagedResponse())
      }
      return Promise.resolve(emptyPagedResponse())
    })

    render(
      <SpurgeonSermonsModal
        isOpen
        onClose={onClose}
        onFollowSermonLink={onFollowSermonLink}
      />
    )

    const link = await screen.findByRole('link', { name: /Follow This Sermon/i })
    await user.click(link)

    expect(onFollowSermonLink).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
