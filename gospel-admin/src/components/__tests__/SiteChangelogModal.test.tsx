import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SiteChangelogModal from '../SiteChangelogModal'

jest.mock('@/hooks/usePostHogModalOpen', () => ({
  usePostHogModalOpen: jest.fn(),
}))

describe('SiteChangelogModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('does not render when closed', () => {
    render(<SiteChangelogModal isOpen={false} onClose={jest.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders same-day entries with duplicate messages as separate list items', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        groups: [
          {
            label: 'June 2026',
            entries: [
              {
                releasedAt: '2026-06-13',
                committedAt: '2026-06-14T02:00:00.000Z',
                message: 'Same note.',
              },
              {
                releasedAt: '2026-06-13',
                committedAt: '2026-06-14T01:00:00.000Z',
                message: 'Same note.',
              },
            ],
          },
        ],
      }),
    })

    render(<SiteChangelogModal isOpen onClose={jest.fn()} />)

    await waitFor(() => {
      expect(screen.getAllByText('Same note.')).toHaveLength(2)
    })
  })

  it('loads and displays grouped changelog entries', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        groups: [
          {
            label: 'June 2026',
            entries: [{ releasedAt: '2026-06-13', message: 'Latest improvement.' }],
          },
        ],
      }),
    })

    render(<SiteChangelogModal isOpen onClose={jest.fn()} />)

    expect(await screen.findByText('June 2026')).toBeInTheDocument()
    expect(screen.getByText('Latest improvement.')).toBeInTheDocument()
    expect(global.fetch).toHaveBeenCalledWith('/api/site-changelog', { cache: 'no-store' })
  })

  it('closes from close button', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ groups: [] }),
    })

    const onClose = jest.fn()
    const user = userEvent.setup()
    render(<SiteChangelogModal isOpen onClose={onClose} />)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /close change log/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
