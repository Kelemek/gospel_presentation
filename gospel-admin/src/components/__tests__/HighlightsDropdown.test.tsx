import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HighlightsDropdown from '../HighlightsDropdown'
import { gospelStorageSetSync } from '@/lib/gospelClientStorage'
import {
  PROFILE_HIGHLIGHTS_STORAGE_KEY,
  loadHighlights,
} from '@/lib/profileHighlightsStorage'
import { installTestLocalStorage } from '@/lib/testing/testLocalStorage'
import { GOSPEL_CLOSE_BOOKMARKS_PANEL_EVENT } from '@/lib/bookmarksPanelCloseEvent'
import { scrollToTocAnchor } from '@/lib/scrollToTocAnchor'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: jest.fn() }),
}))

const mockShowConfirm = jest.fn()
jest.mock('@/contexts/AlertModalContext', () => ({
  useAlertModal: () => ({
    showConfirm: mockShowConfirm,
    showAlert: jest.fn(),
  }),
}))

jest.mock('@/lib/scrollToTocAnchor', () => ({
  scrollToTocAnchor: jest.fn(() => true),
}))

describe('HighlightsDropdown', () => {
  beforeEach(() => {
    installTestLocalStorage()
    mockPush.mockClear()
    mockShowConfirm.mockReset()
    ;(scrollToTocAnchor as jest.Mock).mockClear()
  })

  it('shows quote without raw HTML angle brackets when stored quote contains tags', async () => {
    const user = userEvent.setup()
    gospelStorageSetSync(
      PROFILE_HIGHLIGHTS_STORAGE_KEY,
      JSON.stringify({
        v: 1,
        highlights: [
          {
            id: 'h1',
            slug: 'slug-a',
            resourceTitle: 'Resource A',
            anchorId: 'section-1-0',
            locationLabel: 'Part 1',
            scopeId: 'section-1-0__content',
            quote: 'Hello <strong>Fear</strong></p><p>tail',
            startOffset: 1,
            endOffset: 10,
            createdAt: 1,
          },
        ],
      })
    )

    render(
      <HighlightsDropdown
        profileSlug="slug-a"
        onOpenHighlight={jest.fn()}
        onOpenScriptureHighlight={jest.fn()}
      />
    )
    await user.click(screen.getByRole('button', { name: 'Highlights' }))
    expect(screen.getByText(/Hello Fear tail/)).toBeInTheDocument()
    expect(screen.queryByText(/<strong>/i)).not.toBeInTheDocument()
  })

  it('opens and shows grouped highlights', async () => {
    const user = userEvent.setup()
    gospelStorageSetSync(
      PROFILE_HIGHLIGHTS_STORAGE_KEY,
      JSON.stringify({
        v: 1,
        highlights: [
          {
            id: 'h1',
            slug: 'slug-a',
            resourceTitle: 'Resource A',
            anchorId: 'section-1-0',
            locationLabel: 'Part 1',
            scopeId: 'section-1-0__content',
            quote: 'highlight quote',
            startOffset: 1,
            endOffset: 10,
            createdAt: 1,
          },
        ],
      })
    )

    render(
      <HighlightsDropdown
        profileSlug="slug-a"
        onOpenHighlight={jest.fn()}
        onOpenScriptureHighlight={jest.fn()}
      />
    )
    await user.click(screen.getByRole('button', { name: 'Highlights' }))
    expect(screen.getByRole('dialog', { name: 'Highlights' })).toBeInTheDocument()
    expect(screen.getByText(/Resource A/)).toBeInTheDocument()
    expect(screen.getByText(/highlight quote/i)).toBeInTheDocument()
  })

  it('same slug opens via scroll and callback', async () => {
    const user = userEvent.setup()
    const onOpen = jest.fn()
    gospelStorageSetSync(
      PROFILE_HIGHLIGHTS_STORAGE_KEY,
      JSON.stringify({
        v: 1,
        highlights: [
          {
            id: 'h1',
            slug: 'slug-a',
            resourceTitle: 'Resource A',
            anchorId: 'section-1-0',
            locationLabel: 'Part 1',
            scopeId: 'section-1-0__content',
            quote: 'highlight quote',
            startOffset: 1,
            endOffset: 10,
            createdAt: 1,
          },
        ],
      })
    )
    render(
      <HighlightsDropdown
        profileSlug="slug-a"
        onOpenHighlight={onOpen}
        onOpenScriptureHighlight={jest.fn()}
      />
    )
    await user.click(screen.getByRole('button', { name: 'Highlights' }))
    await user.click(screen.getByText(/highlight quote/i))
    expect(scrollToTocAnchor).toHaveBeenCalledWith('section-1-0')
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'h1' }))
  })

  it('remove asks confirm and removes entry', async () => {
    mockShowConfirm.mockResolvedValue(true)
    const user = userEvent.setup()
    gospelStorageSetSync(
      PROFILE_HIGHLIGHTS_STORAGE_KEY,
      JSON.stringify({
        v: 1,
        highlights: [
          {
            id: 'h1',
            slug: 'slug-a',
            resourceTitle: 'Resource A',
            anchorId: 'section-1-0',
            locationLabel: 'Part 1',
            scopeId: 'section-1-0__content',
            quote: 'highlight quote',
            startOffset: 1,
            endOffset: 10,
            createdAt: 1,
          },
        ],
      })
    )
    render(
      <HighlightsDropdown
        profileSlug="slug-a"
        onOpenHighlight={jest.fn()}
        onOpenScriptureHighlight={jest.fn()}
      />
    )
    await user.click(screen.getByRole('button', { name: 'Highlights' }))
    await user.click(screen.getByRole('button', { name: 'Remove highlight' }))
    await waitFor(() => expect(mockShowConfirm).toHaveBeenCalledWith('Remove this highlight?'))
    await waitFor(() => expect(loadHighlights()).toHaveLength(0))
  })

  it('closes panel when close event dispatched', async () => {
    const user = userEvent.setup()
    render(
      <HighlightsDropdown
        profileSlug="slug-a"
        onOpenHighlight={jest.fn()}
        onOpenScriptureHighlight={jest.fn()}
      />
    )
    await user.click(screen.getByRole('button', { name: 'Highlights' }))
    expect(screen.getByRole('dialog', { name: 'Highlights' })).toBeInTheDocument()
    await act(async () => {
      window.dispatchEvent(new Event(GOSPEL_CLOSE_BOOKMARKS_PANEL_EVENT))
    })
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Highlights' })).not.toBeInTheDocument()
    })
  })

  it('filters highlights by debounced search (quote text)', async () => {
    jest.useFakeTimers()
    try {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      gospelStorageSetSync(
        PROFILE_HIGHLIGHTS_STORAGE_KEY,
        JSON.stringify({
          v: 1,
          highlights: [
            {
              id: 'h1',
              slug: 'slug-a',
              resourceTitle: 'Resource A',
              anchorId: 'section-1-0',
              locationLabel: 'Alpha Part',
              scopeId: 'section-1-0__content',
              quote: 'alpha quote phrase',
              startOffset: 1,
              endOffset: 10,
              createdAt: 2,
            },
            {
              id: 'h2',
              slug: 'slug-a',
              resourceTitle: 'Resource A',
              anchorId: 'section-1-1',
              locationLabel: 'Beta Part',
              scopeId: 'section-1-1__content',
              quote: 'beta different line',
              startOffset: 1,
              endOffset: 10,
              createdAt: 1,
            },
          ],
        })
      )

      render(
      <HighlightsDropdown
        profileSlug="slug-a"
        onOpenHighlight={jest.fn()}
        onOpenScriptureHighlight={jest.fn()}
      />
    )
      await user.click(screen.getByRole('button', { name: 'Highlights' }))
      await user.type(screen.getByRole('searchbox', { name: 'Search highlights' }), 'alpha')

      act(() => {
        jest.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(screen.getByText(/alpha quote phrase/i)).toBeInTheDocument()
        expect(screen.queryByText(/beta different line/i)).not.toBeInTheDocument()
      })
    } finally {
      jest.useRealTimers()
    }
  })

  it('matches search on location label and resource title', async () => {
    jest.useFakeTimers()
    try {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      gospelStorageSetSync(
        PROFILE_HIGHLIGHTS_STORAGE_KEY,
        JSON.stringify({
          v: 1,
          highlights: [
            {
              id: 'h1',
              slug: 'slug-a',
              resourceTitle: 'UniqueBook',
              anchorId: 'section-1-0',
              locationLabel: 'Chapter Five',
              scopeId: 'section-1-0__content',
              quote: 'plain text',
              startOffset: 1,
              endOffset: 5,
              createdAt: 1,
            },
            {
              id: 'h2',
              slug: 'slug-b',
              resourceTitle: 'Other',
              anchorId: 'x',
              locationLabel: 'Somewhere',
              scopeId: 'y',
              quote: 'other quote',
              startOffset: 1,
              endOffset: 5,
              createdAt: 2,
            },
          ],
        })
      )

      render(
      <HighlightsDropdown
        profileSlug="slug-a"
        onOpenHighlight={jest.fn()}
        onOpenScriptureHighlight={jest.fn()}
      />
    )
      await user.click(screen.getByRole('button', { name: 'Highlights' }))
      await user.type(screen.getByRole('searchbox', { name: 'Search highlights' }), 'five')

      act(() => {
        jest.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(screen.getByText(/plain text/i)).toBeInTheDocument()
        expect(screen.queryByText(/other quote/i)).not.toBeInTheDocument()
      })

      await user.clear(screen.getByRole('searchbox', { name: 'Search highlights' }))
      await user.type(screen.getByRole('searchbox', { name: 'Search highlights' }), 'uniquebook')

      act(() => {
        jest.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(screen.getByText(/plain text/i)).toBeInTheDocument()
      })
    } finally {
      jest.useRealTimers()
    }
  })

  it('groups scripture highlights under Old and New Testament', async () => {
    const user = userEvent.setup()
    gospelStorageSetSync(
      PROFILE_HIGHLIGHTS_STORAGE_KEY,
      JSON.stringify({
        v: 2,
        highlights: [
          {
            kind: 'scripture',
            id: 's1',
            reference: 'Psalm 24:1',
            quote: 'The earth is the LORDs',
            colorId: 'blue',
            createdAt: 2,
          },
          {
            kind: 'scripture',
            id: 's2',
            reference: 'John 3:16',
            quote: 'For God so loved',
            colorId: 'red',
            createdAt: 1,
          },
          {
            id: 'h1',
            slug: 'default',
            resourceTitle: 'The Gospel Presentation',
            anchorId: 'section-1-0',
            locationLabel: 'Part 1',
            scopeId: 'section-1-0__content',
            quote: 'resource quote',
            startOffset: 1,
            endOffset: 10,
            createdAt: 3,
          },
        ],
      })
    )
    render(
      <HighlightsDropdown
        profileSlug="default"
        onOpenHighlight={jest.fn()}
        onOpenScriptureHighlight={jest.fn()}
      />
    )
    await user.click(screen.getByRole('button', { name: 'Highlights' }))
    expect(screen.getByText(/Old Testament \(1\)/)).toBeInTheDocument()
    expect(screen.getByText(/New Testament \(1\)/)).toBeInTheDocument()
    expect(screen.getByText(/The earth is the LORDs/)).toBeInTheDocument()
    expect(screen.getByText('Psalm 24:1')).toBeInTheDocument()
    expect(screen.getByText(/For God so loved/)).toBeInTheDocument()
    expect(screen.getByText('John 3:16')).toBeInTheDocument()
    expect(screen.getByText(/The Gospel Presentation \(1\)/)).toBeInTheDocument()
  })

  it('opens scripture highlight via callback', async () => {
    const user = userEvent.setup()
    const onOpenScripture = jest.fn()
    gospelStorageSetSync(
      PROFILE_HIGHLIGHTS_STORAGE_KEY,
      JSON.stringify({
        v: 2,
        highlights: [
          {
            kind: 'scripture',
            id: 's1',
            reference: 'John 3:16',
            quote: 'For God so loved',
            colorId: 'red',
            createdAt: 1,
          },
        ],
      })
    )
    render(
      <HighlightsDropdown
        profileSlug="slug-a"
        onOpenHighlight={jest.fn()}
        onOpenScriptureHighlight={onOpenScripture}
      />
    )
    await user.click(screen.getByRole('button', { name: 'Highlights' }))
    await user.click(screen.getByText(/For God so loved/i))
    expect(onOpenScripture).toHaveBeenCalledWith(
      expect.objectContaining({ id: 's1', reference: 'John 3:16' })
    )
  })
})

