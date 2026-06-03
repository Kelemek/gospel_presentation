/**
 * Resource tab bar: persist reading position before switching profiles.
 */
import React, { type ReactElement } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TextSizeProvider } from '@/contexts/TextSizeContext'
import { gospelStorageSetSync, resetGospelClientStorageForTests } from '@/lib/gospelClientStorage'
import { PROFILE_LAST_OPEN_RESOURCE_STORAGE_KEY } from '@/lib/profileLastOpenResourceStorage'
import {
  loadProfileReadingResume,
  saveProfileReadingResume,
} from '@/lib/profileReadingResumeStorage'
import { captureReadingPositionAtViewport } from '@/lib/profileReadingPosition'
import {
  isProfileResourceTabNavigationPending,
  markProfileResourceTabNavigation,
  peekProfileResourceTabNavigation,
} from '@/lib/profileResourceTabNavigation'
import { installTestLocalStorage } from '@/lib/testing/testLocalStorage'

const mockPush = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
  usePathname: () => '/p1',
  useSearchParams: () => new URLSearchParams(),
}))

jest.mock('@/lib/profileReadingPosition', () => {
  const actual = jest.requireActual('@/lib/profileReadingPosition')
  return {
    ...actual,
    captureReadingPositionAtViewport: jest.fn(() => ({
      anchorId: 'section-1-0',
      plainOffset: 120,
      fingerprint: 'fp-tab-test',
    })),
    restoreReadingPosition: jest.fn(() => () => {}),
  }
})

jest.mock('@/components/ThemeToggle', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/BookmarksDropdown', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/SidebarAuthNav', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/ProfileHelpMenu', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/PresentationFirstVisitWelcome', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/TableOfContents', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/MemorizationPracticeSession', () => ({ __esModule: true, default: () => null }))

jest.mock('@/lib/supabase/client', () => ({
  __esModule: true,
  createClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: null } }),
    },
  }),
}))

import ProfileContent from '@/app/[slug]/ProfileContent'

const sectionsPayload = [
  {
    section: 1,
    title: 'Section 1',
    subsections: [
      {
        title: 'Sub 1',
        content: '<p>Some content</p>',
        scriptureReferences: [],
      },
    ],
  },
]

function renderWithTextSize(ui: ReactElement) {
  return render(<TextSizeProvider>{ui}</TextSizeProvider>)
}

function seedOpenResourceTabs() {
  gospelStorageSetSync(
    PROFILE_LAST_OPEN_RESOURCE_STORAGE_KEY,
    JSON.stringify({
      v: 3,
      resources: [
        { slug: 'p1', title: 'Profile One', openedAt: 1 },
        { slug: 'p2', title: 'Profile Two', openedAt: 2 },
      ],
      resourceTabs: [
        { slug: 'p1', title: 'Profile One' },
        { slug: 'p2', title: 'Profile Two' },
      ],
      scriptures: [],
      scriptureTabs: [],
    })
  )
}

describe('ProfileContent resource tabs reading resume', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetGospelClientStorageForTests()
    installTestLocalStorage()
    seedOpenResourceTabs()
    Object.defineProperty(window, 'scrollY', { value: 200, configurable: true })
    ;(global as any).fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: async () => ({}) })
    ) as any
  })

  test('switching resource tab saves current profile reading position before navigation', async () => {
    const user = userEvent.setup()
    const profile = { id: 'p', isDefault: false }

    renderWithTextSize(
      <ProfileContent
        sections={sectionsPayload as any}
        profileInfo={{ title: 'Profile One', slug: 'p1', favoriteScriptures: [] }}
        profile={profile as any}
      />
    )

    const otherTab = await screen.findByRole('tab', { name: 'Profile Two' })
    await user.click(otherTab)

    await waitFor(() => {
      expect(captureReadingPositionAtViewport).toHaveBeenCalledWith(
        sectionsPayload,
        'p1'
      )
    })

    await waitFor(() => {
      expect(loadProfileReadingResume('p1')).toEqual({
        v: 1,
        anchorId: 'section-1-0',
        plainOffset: 120,
        fingerprint: 'fp-tab-test',
      })
    })

    expect(mockPush).toHaveBeenCalledWith('/p2', { scroll: false })
  })

  test('tab switch at page top saves new section after navigating away from deeper section', async () => {
    saveProfileReadingResume('p1', 'section-1-0-1', 500, 'fp-deep')
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })

    const captureMock = captureReadingPositionAtViewport as jest.Mock
    captureMock.mockReturnValue({
      anchorId: 'section-2-0',
      plainOffset: 0,
      fingerprint: 'fp-new-section',
    })

    const user = userEvent.setup()
    renderWithTextSize(
      <ProfileContent
        sections={sectionsPayload as any}
        profileInfo={{ title: 'Profile One', slug: 'p1', favoriteScriptures: [] }}
        profile={{ id: 'p', isDefault: false } as any}
      />
    )

    await user.click(await screen.findByRole('tab', { name: 'Profile Two' }))

    expect(loadProfileReadingResume('p1')).toEqual({
      v: 1,
      anchorId: 'section-2-0',
      plainOffset: 0,
      fingerprint: 'fp-new-section',
    })
  })

  test('tab switch at page top does not regress deeper position within same section', async () => {
    saveProfileReadingResume('p1', 'section-1-0', 500, 'fp-deep')
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })

    const captureMock = captureReadingPositionAtViewport as jest.Mock
    captureMock.mockReturnValue({
      anchorId: 'section-1-0',
      plainOffset: 0,
      fingerprint: 'fp-shallow',
    })

    const user = userEvent.setup()
    renderWithTextSize(
      <ProfileContent
        sections={sectionsPayload as any}
        profileInfo={{ title: 'Profile One', slug: 'p1', favoriteScriptures: [] }}
        profile={{ id: 'p', isDefault: false } as any}
      />
    )

    await user.click(await screen.findByRole('tab', { name: 'Profile Two' }))

    expect(loadProfileReadingResume('p1')).toEqual({
      v: 1,
      anchorId: 'section-1-0',
      plainOffset: 500,
      fingerprint: 'fp-deep',
    })
  })

  test('unmounting profile clears abandoned tab navigation staging', () => {
    markProfileResourceTabNavigation('p2', {
      v: 1,
      anchorId: 'section-1-0',
      plainOffset: 50,
      fingerprint: 'fp-staged',
    })
    expect(isProfileResourceTabNavigationPending('p2')).toBe(true)

    const { unmount } = renderWithTextSize(
      <ProfileContent
        sections={sectionsPayload as any}
        profileInfo={{ title: 'Profile Two', slug: 'p2', favoriteScriptures: [] }}
        profile={{ id: 'p2', isDefault: false } as any}
      />
    )

    unmount()

    expect(peekProfileResourceTabNavigation('p2')).toBeUndefined()
    expect(isProfileResourceTabNavigationPending('p2')).toBe(false)
  })
})
