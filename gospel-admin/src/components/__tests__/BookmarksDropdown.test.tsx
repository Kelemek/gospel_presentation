import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BookmarksDropdown, {
  bookmarksPanelStyleFromTrigger,
  openProfileBookmark,
} from '../BookmarksDropdown'
import type { GospelSection } from '@/lib/types'
import { GOSPEL_CLOSE_BOOKMARKS_PANEL_EVENT } from '@/lib/bookmarksPanelCloseEvent'
import { gospelStorageSetSync } from '@/lib/gospelClientStorage'
import { loadBookmarks, PROFILE_BOOKMARKS_STORAGE_KEY } from '@/lib/profileBookmarksStorage'
import { installTestLocalStorage } from '@/lib/testing/testLocalStorage'
import { scrollToTocAnchor } from '@/lib/scrollToTocAnchor'
import { restoreReadingPosition } from '@/lib/profileReadingPosition'
import { setPendingBookmarkResume } from '@/lib/profileBookmarkResumeSession'

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

jest.mock('@/lib/tocAnchorFromScroll', () => ({
  getCurrentTocAnchorId: jest.fn(() => 'section-1-0'),
  getLocationLabel: jest.fn(() => 'Section / Here'),
}))

jest.mock('@/lib/scrollToTocAnchor', () => ({
  scrollToTocAnchor: jest.fn(() => true),
}))

jest.mock('@/lib/profileReadingPosition', () => ({
  captureReadingPositionAtViewport: jest.fn(() => ({
    anchorId: 'section-1-0',
    plainOffset: 12,
    fingerprint: 'fp-test',
    excerpt: 'sample excerpt',
  })),
  restoreReadingPosition: jest.fn(() => () => {}),
}))

jest.mock('@/lib/profileBookmarkResumeSession', () => ({
  setPendingBookmarkResume: jest.fn(),
}))

const sections: GospelSection[] = [
  {
    section: '1',
    title: 'One',
    subsections: [{ title: 'Sub', content: 'x' }],
  },
]

describe('BookmarksDropdown', () => {
  beforeEach(() => {
    installTestLocalStorage()
    mockPush.mockClear()
    mockShowConfirm.mockReset()
    ;(scrollToTocAnchor as jest.Mock).mockClear()
    ;(restoreReadingPosition as jest.Mock).mockClear()
    ;(setPendingBookmarkResume as jest.Mock).mockClear()
  })

  it('opens panel and adds bookmark', async () => {
    const user = userEvent.setup()
    render(
      <BookmarksDropdown
        sections={sections}
        profileTitle="My Resource"
        profileSlug="slug-a"
      />
    )

    await user.click(screen.getByRole('button', { name: 'Bookmarks' }))
    expect(screen.getByRole('dialog', { name: 'Bookmarks' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Add bookmark/i }))
    await waitFor(() => {
      expect(loadBookmarks()).toHaveLength(1)
    })
    expect(loadBookmarks()[0].resourceTitle).toBe('My Resource')
    expect(loadBookmarks()[0].slug).toBe('slug-a')
    expect(loadBookmarks()[0].plainOffset).toBe(12)
    expect(loadBookmarks()[0].fingerprint).toBe('fp-test')
  })

  it('closes panel when gospel tour close event is dispatched', async () => {
    const user = userEvent.setup()
    render(
      <BookmarksDropdown
        sections={sections}
        profileTitle="My Resource"
        profileSlug="slug-a"
      />
    )

    await user.click(screen.getByRole('button', { name: 'Bookmarks' }))
    expect(screen.getByRole('dialog', { name: 'Bookmarks' })).toBeInTheDocument()

    await act(async () => {
      window.dispatchEvent(new Event(GOSPEL_CLOSE_BOOKMARKS_PANEL_EVENT))
    })
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Bookmarks' })).not.toBeInTheDocument()
    })
  })

  it('shows Already saved on duplicate add', async () => {
    const user = userEvent.setup()
    render(
      <BookmarksDropdown
        sections={sections}
        profileTitle="R"
        profileSlug="s"
      />
    )
    await user.click(screen.getByRole('button', { name: 'Bookmarks' }))
    await user.click(screen.getByRole('button', { name: /Add bookmark/i }))
    await user.click(screen.getByRole('button', { name: /Add bookmark/i }))
    expect(await screen.findByText('Already saved')).toBeInTheDocument()
  })

  it('openProfileBookmark treats plainOffset 0 as precise on same slug', () => {
    ;(restoreReadingPosition as jest.Mock).mockClear()
    ;(scrollToTocAnchor as jest.Mock).mockClear()

    openProfileBookmark(
      {
        id: 'zero',
        slug: 'here',
        resourceTitle: 'R',
        anchorId: 'section-1-0',
        locationLabel: 'L',
        plainOffset: 0,
        fingerprint: 'fp-zero',
        createdAt: 1,
      },
      'here',
      { push: mockPush }
    )

    expect(restoreReadingPosition).toHaveBeenCalledWith(
      'section-1-0',
      0,
      'fp-zero',
      'here'
    )
    expect(scrollToTocAnchor).not.toHaveBeenCalled()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('navigates same slug via scroll', async () => {
    const user = userEvent.setup()
    render(
      <BookmarksDropdown
        sections={sections}
        profileTitle="R"
        profileSlug="here"
      />
    )
    await user.click(screen.getByRole('button', { name: 'Bookmarks' }))
    await user.click(screen.getByRole('button', { name: /Add bookmark/i }))
    await user.click(screen.getByRole('button', { name: /R Section \/ Here/ }))

    expect(mockPush).not.toHaveBeenCalled()
    expect(restoreReadingPosition).toHaveBeenCalledWith(
      'section-1-0',
      12,
      'fp-test',
      'here'
    )
    expect(scrollToTocAnchor).not.toHaveBeenCalled()
  })

  it('navigates other slug via router.push', async () => {
    const user = userEvent.setup()
    gospelStorageSetSync(
      PROFILE_BOOKMARKS_STORAGE_KEY,
      JSON.stringify({
        v: 1,
        bookmarks: [
          {
            id: 'id-1',
            slug: 'other',
            resourceTitle: 'Other book',
            anchorId: 'section-2-0',
            locationLabel: 'L',
            createdAt: 1,
          },
        ],
      })
    )

    render(
      <BookmarksDropdown
        sections={sections}
        profileTitle="R"
        profileSlug="here"
      />
    )
    await user.click(screen.getByRole('button', { name: 'Bookmarks' }))
    await user.click(screen.getByText('Other book'))

    expect(mockPush).toHaveBeenCalledWith('/other#section-2-0')
    expect(setPendingBookmarkResume).not.toHaveBeenCalled()
  })

  it('sets session resume when opening precise bookmark on another slug', async () => {
    const user = userEvent.setup()
    gospelStorageSetSync(
      PROFILE_BOOKMARKS_STORAGE_KEY,
      JSON.stringify({
        v: 2,
        bookmarks: [
          {
            id: 'id-1',
            slug: 'other',
            resourceTitle: 'Other book',
            anchorId: 'section-2-0',
            locationLabel: 'L',
            plainOffset: 40,
            fingerprint: 'fp-other',
            createdAt: 1,
          },
        ],
      })
    )

    render(
      <BookmarksDropdown
        sections={sections}
        profileTitle="R"
        profileSlug="here"
      />
    )
    await user.click(screen.getByRole('button', { name: 'Bookmarks' }))
    await user.click(screen.getByText('Other book'))

    expect(setPendingBookmarkResume).toHaveBeenCalledWith({
      anchorId: 'section-2-0',
      plainOffset: 40,
      fingerprint: 'fp-other',
    })
    expect(mockPush).toHaveBeenCalledWith('/other#section-2-0')
  })

  it('shows excerpt behind chevron toggle', async () => {
    const user = userEvent.setup()
    gospelStorageSetSync(
      PROFILE_BOOKMARKS_STORAGE_KEY,
      JSON.stringify({
        v: 2,
        bookmarks: [
          {
            id: 'id-excerpt',
            slug: 'here',
            resourceTitle: 'Long Resource Name',
            anchorId: 'section-1-0',
            locationLabel: 'Section label',
            plainOffset: 5,
            fingerprint: 'fp',
            excerpt: 'Hidden passage preview text',
            createdAt: 1,
          },
        ],
      })
    )

    render(
      <BookmarksDropdown sections={sections} profileTitle="R" profileSlug="here" />
    )
    await user.click(screen.getByRole('button', { name: 'Bookmarks' }))
    expect(screen.queryByText('Hidden passage preview text')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show excerpt' }))
    expect(screen.getByText('Hidden passage preview text')).toBeInTheDocument()
  })

  it('remove asks confirm and removes', async () => {
    mockShowConfirm.mockResolvedValue(true)
    const user = userEvent.setup()
    gospelStorageSetSync(
      PROFILE_BOOKMARKS_STORAGE_KEY,
      JSON.stringify({
        v: 1,
        bookmarks: [
          {
            id: 'rm-1',
            slug: 's',
            resourceTitle: 'T',
            anchorId: 'section-1',
            locationLabel: 'L',
            createdAt: 1,
          },
        ],
      })
    )

    render(
      <BookmarksDropdown
        sections={sections}
        profileTitle="R"
        profileSlug="here"
      />
    )
    await user.click(screen.getByRole('button', { name: 'Bookmarks' }))
    await user.click(screen.getByRole('button', { name: 'Remove bookmark' }))

    await waitFor(() => {
      expect(mockShowConfirm).toHaveBeenCalledWith('Remove this bookmark?')
    })
    await waitFor(() => {
      expect(loadBookmarks()).toHaveLength(0)
    })
  })

  it('filters bookmarks by debounced search', async () => {
    jest.useFakeTimers()
    try {
      gospelStorageSetSync(
        PROFILE_BOOKMARKS_STORAGE_KEY,
        JSON.stringify({
          v: 1,
          bookmarks: [
            {
              id: 'b1',
              slug: 'slug-a',
              resourceTitle: 'Alpha Guide',
              anchorId: 'section-1-0',
              locationLabel: 'Intro',
              createdAt: 2,
            },
            {
              id: 'b2',
              slug: 'slug-b',
              resourceTitle: 'Beta Handbook',
              anchorId: 'section-2-0',
              locationLabel: 'Middle',
              createdAt: 1,
            },
          ],
        })
      )

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      render(
        <BookmarksDropdown sections={sections} profileTitle="My Resource" profileSlug="slug-a" />
      )

      await user.click(screen.getByRole('button', { name: 'Bookmarks' }))
      await user.type(screen.getByRole('searchbox', { name: 'Search bookmarks' }), 'beta')

      await act(async () => {
        jest.advanceTimersByTime(260)
      })

      await waitFor(() => {
        expect(screen.getByText('Beta Handbook')).toBeInTheDocument()
        expect(screen.queryByText('Alpha Guide')).not.toBeInTheDocument()
      })
    } finally {
      jest.useRealTimers()
    }
  })
})

describe('bookmarksPanelStyleFromTrigger', () => {
  const origInnerWidth = window.innerWidth

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: origInnerWidth,
    })
  })

  it('on narrow viewports, centers the panel horizontally below the trigger', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 400,
    })
    const rect = { right: 390, bottom: 44 } as DOMRectReadOnly
    const s = bookmarksPanelStyleFromTrigger(rect)
    expect(s.top).toBe(52)
    expect(s.width).toBe(320)
    expect(s.left).toBe(40)
    expect(s.right).toBe('auto')
  })

  it('on md+ viewports, aligns panel right edge to the trigger (opens left)', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 900,
    })
    const rect = { right: 390, bottom: 44 } as DOMRectReadOnly
    const s = bookmarksPanelStyleFromTrigger(rect)
    expect(s.top).toBe(52)
    expect(s.width).toBe(320)
    expect(s.left).toBe(70)
    expect(s.right).toBe('auto')
  })

  it('on md+ narrows the panel when the trigger is too far left for full width', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 900,
    })
    const rect = { right: 100, bottom: 10 } as DOMRectReadOnly
    const s = bookmarksPanelStyleFromTrigger(rect)
    expect(s.left).toBe(8)
    expect(s.width).toBe(92)
    expect(s.top).toBe(18)
  })
})
