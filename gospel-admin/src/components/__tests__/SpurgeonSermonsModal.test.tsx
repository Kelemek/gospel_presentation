import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { MouseEvent, ReactNode } from 'react'
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
      json: () => Promise.resolve({ items: [], total: 0, page: 1, pageSize: 20 }),
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
        expect.stringMatching(/\/api\/spurgeon\/sermons\?[^]*page=1[^]*pageSize=25/),
        expect.any(Object)
      )
    })
    expect(screen.getByRole('heading', { name: /Spurgeon sermons/i })).toBeInTheDocument()
  })

  it('switches to by scripture tab and runs lookup', async () => {
    const user = userEvent.setup()
    mockFetch.mockImplementation((input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('by-reference')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: [{ slug: 'sg00001', title: 'Test Sermon' }] }),
        } as Response)
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items: [], total: 0, page: 1, pageSize: 20 }),
      } as Response)
    })

    render(<SpurgeonSermonsModal isOpen onClose={jest.fn()} />)

    await user.click(screen.getByRole('button', { name: /By scripture/i }))
    await user.type(screen.getByLabelText(/Scripture reference/i), 'John 3:16')
    await user.click(screen.getByRole('button', { name: /Find sermons/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/spurgeon/by-reference?reference='),
        expect.any(Object)
      )
    })
    expect(await screen.findByRole('link', { name: /Test Sermon/i })).toHaveAttribute('href', '/sg00001')
  })

  it('opens By scripture with initialByReference and runs lookup', async () => {
    mockFetch.mockImplementation((input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('by-reference')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: [{ slug: 'sg00002', title: 'From Initial Ref' }] }),
        } as Response)
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items: [], total: 0, page: 1, pageSize: 20 }),
      } as Response)
    })

    render(
      <SpurgeonSermonsModal
        isOpen
        onClose={jest.fn()}
        initialByReference="Romans 8:28"
      />
    )

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/spurgeon\/by-reference\?reference=/),
        expect.any(Object)
      )
    })
    expect(await screen.findByRole('link', { name: /From Initial Ref/i })).toHaveAttribute('href', '/sg00002')
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
          pageSize: 25,
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
