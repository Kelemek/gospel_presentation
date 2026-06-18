import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BibleSearchModal from '../BibleSearchModal'
import type { BibleSearchPage } from '@/lib/bible-search-api'
import { RESOURCE_SEARCH_MATCH_ATTR } from '@/lib/profileResourceInPageSearch'
import { isProfileResourceSearchContentTouchBlurHost } from '@/lib/memorizationViewportPlatform'

jest.mock('@/lib/memorizationViewportPlatform', () => ({
  isProfileResourceSearchContentTouchBlurHost: jest.fn(() => false),
}))

const mockIsProfileResourceSearchContentTouchBlurHost =
  isProfileResourceSearchContentTouchBlurHost as jest.MockedFunction<
    typeof isProfileResourceSearchContentTouchBlurHost
  >

const session: BibleSearchPage = {
  translation: 'esv',
  query: 'grace',
  total: 1,
  page: 1,
  pageSize: 20,
  totalPages: 1,
  items: [{ reference: 'Ephesians 2:8', snippet: 'For by grace you have been saved' }],
}

describe('BibleSearchModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('highlights the search query in result snippets', async () => {
    render(
      <BibleSearchModal
        isOpen
        onClose={jest.fn()}
        translation="esv"
        translationLabel="ESV"
        session={session}
        onSessionChange={jest.fn()}
        onSelectReference={jest.fn()}
      />
    )

    await waitFor(() => {
      const mark = document.querySelector(`mark[${RESOURCE_SEARCH_MATCH_ATTR}]`)
      expect(mark).toHaveTextContent('grace')
    })
    expect(document.querySelector('.bible-search-snippet')).not.toBeNull()
  })

  it('restores session on reopen without refetching', async () => {
    const onSessionChange = jest.fn()
    const { rerender } = render(
      <BibleSearchModal
        isOpen
        onClose={jest.fn()}
        translation="esv"
        translationLabel="ESV"
        session={session}
        onSessionChange={onSessionChange}
        onSelectReference={jest.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Ephesians 2:8')).toBeInTheDocument()
    })
    expect(global.fetch).not.toHaveBeenCalled()

    rerender(
      <BibleSearchModal
        isOpen={false}
        onClose={jest.fn()}
        translation="esv"
        translationLabel="ESV"
        session={session}
        onSessionChange={onSessionChange}
        onSelectReference={jest.fn()}
      />
    )

    rerender(
      <BibleSearchModal
        isOpen
        onClose={jest.fn()}
        translation="esv"
        translationLabel="ESV"
        session={session}
        onSessionChange={onSessionChange}
        onSelectReference={jest.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Ephesians 2:8')).toBeInTheDocument()
    })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('fetches when user types a new query', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => session,
    })

    render(
      <BibleSearchModal
        isOpen
        onClose={jest.fn()}
        translation="esv"
        translationLabel="ESV"
        session={null}
        onSessionChange={jest.fn()}
        onSelectReference={jest.fn()}
      />
    )

    await user.type(screen.getByRole('searchbox'), 'grace')

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/scripture/search?q=grace')
    )
  }, 10000)

  it('calls onSelectReference when a hit is chosen', async () => {
    const user = userEvent.setup()
    const onSelectReference = jest.fn()

    render(
      <BibleSearchModal
        isOpen
        onClose={jest.fn()}
        translation="esv"
        translationLabel="ESV"
        session={session}
        onSessionChange={jest.fn()}
        onSelectReference={onSelectReference}
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Ephesians 2:8/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /Ephesians 2:8/i }))
    expect(onSelectReference).toHaveBeenCalledWith('Ephesians 2:8')
  })

  it('on mobile, blurs the search field when touching the results list', async () => {
    mockIsProfileResourceSearchContentTouchBlurHost.mockReturnValue(true)
    render(
      <BibleSearchModal
        isOpen
        onClose={jest.fn()}
        translation="esv"
        translationLabel="ESV"
        session={session}
        onSessionChange={jest.fn()}
        onSelectReference={jest.fn()}
      />
    )

    const input = screen.getByRole('searchbox')
    input.focus()
    expect(document.activeElement).toBe(input)

    await waitFor(() => {
      expect(screen.getByText('Ephesians 2:8')).toBeInTheDocument()
    })

    fireEvent.touchStart(screen.getByRole('button', { name: /Ephesians 2:8/i }), {
      touches: [{ clientX: 0, clientY: 0 }],
    })

    expect(document.activeElement).not.toBe(input)
  })

  it('on desktop, blurs the search field when clicking the results list', async () => {
    render(
      <BibleSearchModal
        isOpen
        onClose={jest.fn()}
        translation="esv"
        translationLabel="ESV"
        session={session}
        onSessionChange={jest.fn()}
        onSelectReference={jest.fn()}
      />
    )

    const input = screen.getByRole('searchbox')
    input.focus()
    expect(document.activeElement).toBe(input)

    await waitFor(() => {
      expect(screen.getByText('Ephesians 2:8')).toBeInTheDocument()
    })

    fireEvent.mouseDown(screen.getByRole('button', { name: /Ephesians 2:8/i }))

    expect(document.activeElement).not.toBe(input)
  })
})
