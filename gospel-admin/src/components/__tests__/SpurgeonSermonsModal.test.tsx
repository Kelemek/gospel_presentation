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

describe('SpurgeonSermonsModal', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [], total: 0, page: 1, pageSize: 100 }),
    } as Response)
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
    expect(screen.getByRole('heading', { name: /Spurgeon sermons/i })).toBeInTheDocument()
  })

  it('switches to by scripture tab and runs lookup after debounced typing', async () => {
    const user = userEvent.setup()
    mockFetch.mockImplementation((input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.toString()
      if (url.includes('by-reference')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: [{ slug: 'sg00001', title: 'Test Sermon' }] }),
        } as Response)
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items: [], total: 0, page: 1, pageSize: 100 }),
      } as Response)
    })

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
    mockFetch.mockImplementation((input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.toString()
      if (url.includes('by-reference')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: [{ slug: 'sg00002', title: 'From Initial Ref' }] }),
        } as Response)
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items: [], total: 0, page: 1, pageSize: 100 }),
      } as Response)
    })

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

  it('shows sermon title without leading Sermon N. catalog prefix in search results', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          items: [{ slug: 'sg00042', title: 'Sermon 42. Grace Abounding' }],
          total: 1,
          page: 1,
          pageSize: 100,
        }),
    } as Response)

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
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          items: [{ slug: 'sg00999', title: 'Follow This Sermon' }],
          total: 1,
          page: 1,
          pageSize: 100,
        }),
    } as Response)

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
