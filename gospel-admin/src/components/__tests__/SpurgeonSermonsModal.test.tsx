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
  calvinItems: { slug: string; title: string }[] = [],
  bookItems: { slug: string; title: string }[] = []
) {
  return (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.toString()
    if (url.includes('/api/books/by-reference')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items: bookItems }),
      } as Response)
    }
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
    if (url.includes('/api/edwards/by-reference')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items: [] }),
      } as Response)
    }
    if (url.includes('/api/henry/by-reference')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items: [] }),
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

  it('does not keep stale Spurgeon pagination after close and reopen with no results', async () => {
    let spurgeonSearchCalls = 0
    mockFetch.mockImplementation((input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.toString()
      if (url.includes('/api/spurgeon/sermons')) {
        spurgeonSearchCalls += 1
        if (spurgeonSearchCalls === 1) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                items: [{ slug: 'sg00001', title: 'Sermon 1. Grace' }],
                total: 250,
                page: 1,
                pageSize: 100,
              }),
          } as Response)
        }
        return Promise.resolve(emptyPagedResponse())
      }
      return Promise.resolve(emptyPagedResponse())
    })

    const { rerender } = render(
      <SpurgeonSermonsModal isOpen onClose={jest.fn()} libraryFocus="spurgeon" />
    )

    expect(await screen.findByLabelText(/Study search pagination/i)).toHaveTextContent('of 250')

    rerender(<SpurgeonSermonsModal isOpen={false} onClose={jest.fn()} libraryFocus="spurgeon" />)
    rerender(<SpurgeonSermonsModal isOpen onClose={jest.fn()} libraryFocus="spurgeon" />)

    await waitFor(() => {
      expect(spurgeonSearchCalls).toBeGreaterThanOrEqual(2)
    })
    expect(screen.queryByLabelText(/Study search pagination/i)).not.toBeInTheDocument()
    expect(await screen.findByText(/No matching public sermons/i)).toBeInTheDocument()
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

  it('Search tab profile links omit studyRef even when scripture input has text', async () => {
    const user = userEvent.setup()
    mockFetch.mockImplementation((input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.toString()
      if (url.includes('/api/spurgeon/sermons')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              items: [{ slug: 'sg00099', title: 'Search Hit' }],
              total: 1,
              page: 1,
              pageSize: 100,
            }),
        } as Response)
      }
      return Promise.resolve(emptyPagedResponse())
    })

    render(<SpurgeonSermonsModal isOpen onClose={jest.fn()} />)

    await user.click(screen.getByRole('button', { name: /By scripture/i }))
    await user.type(screen.getByLabelText(/Scripture reference/i), 'John 3:16')
    await user.click(screen.getByRole('button', { name: /^Search$/i }))

    expect(await screen.findByRole('link', { name: /Search Hit/i })).toHaveAttribute('href', '/sg00099')
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
    expect(await screen.findByRole('link', { name: /Test Sermon/i })).toHaveAttribute(
      'href',
      '/sg00001?studyRef=John%203%3A16'
    )
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
    expect(await screen.findByRole('link', { name: /From Initial Ref/i })).toHaveAttribute(
      'href',
      '/sg00002?studyRef=Romans%208%3A28'
    )
  })

  it('shows Books section on By scripture when books by-reference returns hits', async () => {
    const user = userEvent.setup()
    mockFetch.mockImplementation(
      mockByReferenceFetch([], [], [], [{ slug: 'lbst', title: 'Systematic Theology (Louis Berkhof)' }])
    )

    render(<SpurgeonSermonsModal isOpen onClose={jest.fn()} />)

    await user.click(screen.getByRole('button', { name: /By scripture/i }))
    await user.type(screen.getByLabelText(/Scripture reference/i), 'Romans 3:23')

    expect(await screen.findByRole('heading', { name: /^Books$/i })).toBeInTheDocument()
    expect(
      await screen.findByRole('link', { name: /Systematic Theology \(Louis Berkhof\)/i })
    ).toHaveAttribute('href', '/lbst?studyRef=Romans%203%3A23')
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
    expect(await screen.findByRole('link', { name: /Calvin on Romans/i })).toHaveAttribute(
      'href',
      '/cvrom?studyRef=Romans%208%3A28'
    )
  })

  it('paginates Edwards-only search when total exceeds page size', async () => {
    const user = userEvent.setup()

    mockFetch.mockImplementation((input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.toString()
      const page = Number(new URL(url, 'http://localhost').searchParams.get('page') || '1')

      if (url.includes('/api/edwards/sermons')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              items:
                page === 1
                  ? [{ slug: 'je01', title: 'Sinners in the Hands of an Angry God' }]
                  : [{ slug: 'je02', title: 'A Divine and Supernatural Light' }],
              total: 150,
              page,
              pageSize: 100,
            }),
        } as Response)
      }
      return Promise.resolve(emptyPagedResponse())
    })

    render(<SpurgeonSermonsModal isOpen onClose={jest.fn()} libraryFocus="edwards" />)

    const footer = await screen.findByLabelText(/Study search pagination/i)
    expect(footer).toHaveTextContent('Edwards 1–100 of 150')
    expect(footer).toHaveTextContent('Page 1 of 2')
    expect(screen.getByRole('button', { name: /^Next$/i })).not.toBeDisabled()

    await user.click(screen.getByRole('button', { name: /^Next$/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/Study search pagination/i)).toHaveTextContent('Edwards 101–150 of 150')
    })
    expect(screen.getByLabelText(/Study search pagination/i)).toHaveTextContent('Page 2 of 2')
    expect(screen.getByRole('button', { name: /^Next$/i })).toBeDisabled()
  })

  it('search empty message for libraryFocus all mentions Edwards sermons', async () => {
    mockFetch.mockImplementation(() => Promise.resolve(emptyPagedResponse()))

    render(<SpurgeonSermonsModal isOpen onClose={jest.fn()} libraryFocus="all" />)

    expect(
      await screen.findByText(
        /No matching study resources/i
      )
    ).toBeInTheDocument()
  })

  it('scripture empty message for libraryFocus all uses generic study resources copy', async () => {
    const user = userEvent.setup()
    mockFetch.mockImplementation(mockByReferenceFetch([], [], []))

    render(<SpurgeonSermonsModal isOpen onClose={jest.fn()} libraryFocus="all" />)

    await user.click(screen.getByRole('button', { name: /By scripture/i }))
    await user.type(screen.getByLabelText(/Scripture reference/i), 'Romans 8:28')

    expect(
      await screen.findByText(/No indexed study resources for that reference/i)
    ).toBeInTheDocument()
  })

  it('does not show scripture empty message before debounced lookup finishes', async () => {
    const user = userEvent.setup()
    mockFetch.mockImplementation(mockByReferenceFetch([{ slug: 'sg00001', title: 'Sermon' }]))

    render(<SpurgeonSermonsModal isOpen onClose={jest.fn()} libraryFocus="spurgeon" />)

    await user.click(screen.getByRole('button', { name: /By scripture/i }))
    await user.type(screen.getByLabelText(/Scripture reference/i), 'John 3:16')

    expect(screen.queryByText(/No indexed sermons or Morning & Evening/i)).not.toBeInTheDocument()

    expect(await screen.findByRole('link', { name: /Sermon/i })).toBeInTheDocument()
  })

  it('opens Edwards library on Search tab with sermon list', async () => {
    mockFetch.mockImplementation((input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.toString()
      if (url.includes('/api/edwards/sermons')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              items: [{ slug: 'je01', title: 'Sinners in the Hands of an Angry God' }],
              total: 1,
              page: 1,
              pageSize: 100,
            }),
        } as Response)
      }
      return Promise.resolve(emptyPagedResponse())
    })

    render(<SpurgeonSermonsModal isOpen onClose={jest.fn()} libraryFocus="edwards" />)

    expect(await screen.findByRole('link', { name: /Sinners in the Hands of an Angry God/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Search$/i })).toHaveClass('border-blue-600')
  })

  it('loads Edwards by-reference hits after debounce', async () => {
    const user = userEvent.setup()
    mockFetch.mockImplementation((input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.toString()
      if (url.includes('/api/edwards/by-reference')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              items: [{ slug: 'je01', title: 'Sinners in the Hands of an Angry God' }],
            }),
        } as Response)
      }
      return Promise.resolve(emptyPagedResponse())
    })

    render(<SpurgeonSermonsModal isOpen onClose={jest.fn()} libraryFocus="edwards" />)

    await user.click(screen.getByRole('button', { name: /By scripture/i }))
    await user.type(screen.getByLabelText(/Scripture reference/i), 'Deuteronomy 32:35')

    expect(
      await screen.findByRole('link', { name: /Sinners in the Hands of an Angry God/i })
    ).toHaveAttribute('href', '/je01?studyRef=Deuteronomy%2032%3A35')
  })

  it('shows Edwards API error on search when libraryFocus is edwards and sermons request fails', async () => {
    mockFetch.mockImplementation((input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.toString()
      if (url.includes('/api/edwards/sermons')) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Edwards catalog unavailable' }),
        } as Response)
      }
      return Promise.resolve(emptyPagedResponse())
    })

    render(<SpurgeonSermonsModal isOpen onClose={jest.fn()} libraryFocus="edwards" />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Edwards catalog unavailable')
  })

  it('shows Edwards API error on By scripture when Edwards by-reference fails', async () => {
    const user = userEvent.setup()
    mockFetch.mockImplementation((input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.toString()
      if (url.includes('/api/edwards/by-reference')) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Edwards index offline' }),
        } as Response)
      }
      return Promise.resolve(emptyPagedResponse())
    })

    render(<SpurgeonSermonsModal isOpen onClose={jest.fn()} libraryFocus="edwards" />)

    await user.click(screen.getByRole('button', { name: /By scripture/i }))
    await user.type(screen.getByLabelText(/Scripture reference/i), 'Romans 8:28')

    expect(await screen.findByRole('alert')).toHaveTextContent('Edwards index offline')
  })

  it('prefers Edwards error over generic fallback when all enabled search APIs fail', async () => {
    mockFetch.mockImplementation((input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.toString()
      if (url.includes('/api/edwards/sermons')) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Edwards search failed' }),
        } as Response)
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({}),
      } as Response)
    })

    render(<SpurgeonSermonsModal isOpen onClose={jest.fn()} libraryFocus="all" />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Edwards search failed')
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

  it('with libraryFocus henry only fetches Henry books on search, not sermons', async () => {
    render(<SpurgeonSermonsModal isOpen onClose={jest.fn()} libraryFocus="henry" />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/henry\/books\?/),
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
