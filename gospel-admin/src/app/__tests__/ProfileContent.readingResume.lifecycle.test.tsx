/**
 * Reading resume lifecycle: visibility hide/show, scroll-top save guard.
 */
import React, { type ReactElement } from 'react'
import { act, render, waitFor } from '@testing-library/react'
import { TextSizeProvider } from '@/contexts/TextSizeContext'
import { resetGospelClientStorageForTests } from '@/lib/gospelClientStorage'
import {
  loadProfileReadingResume,
  saveProfileReadingResume,
} from '@/lib/profileReadingResumeStorage'
import {
  captureReadingPositionAtViewport,
  isReadingPositionFingerprintValid,
  restoreReadingPosition,
} from '@/lib/profileReadingPosition'
import { installTestBrowserStorage } from '@/lib/testing/testLocalStorage'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/default',
  useSearchParams: () => new URLSearchParams(),
}))

jest.mock('@/lib/profileReadingPosition', () => {
  const actual = jest.requireActual('@/lib/profileReadingPosition')
  return {
    ...actual,
    captureReadingPositionAtViewport: jest.fn(() => ({
      anchorId: 'section-1-0',
      plainOffset: 0,
      fingerprint: 'fp-shallow',
      excerpt: '',
    })),
    restoreReadingPosition: jest.fn(() => () => {}),
    isReadingPositionFingerprintValid: jest.fn(() => true),
  }
})

jest.mock('@/lib/publicResourcesMenuClient', () => {
  const actual = jest.requireActual('@/lib/publicResourcesMenuClient')
  return { ...actual, prefetchPublicResourcesMenu: jest.fn() }
})

jest.mock('@/lib/gospelClientStorage', () => {
  const actual = jest.requireActual('@/lib/gospelClientStorage')
  return {
    ...actual,
    hydrateGospelClientStorage: jest.fn().mockResolvedValue(undefined),
  }
})

jest.mock('@/components/ThemeToggle', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/BookmarksDropdown', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/SidebarAuthNav', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/ProfileHelpMenu', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/PresentationFirstVisitWelcome', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/TableOfContents', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/MemorizationPracticeSession', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/ProfileResourceTabs', () => ({ __esModule: true, default: () => null }))

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
      { title: 'Sub 1', content: '<p>Some content</p>', scriptureReferences: [] },
      { title: 'Sub 2', content: '<p>More content</p>', scriptureReferences: [] },
    ],
  },
  {
    section: 2,
    title: 'Section 2',
    subsections: [{ title: 'Sub A', content: '<p>Later</p>', scriptureReferences: [] }],
  },
]

function renderWithTextSize(ui: ReactElement) {
  return render(<TextSizeProvider>{ui}</TextSizeProvider>)
}

async function flushMountReadingResumeTimer(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 150))
  })
}

let visibilityStateValue: DocumentVisibilityState = 'visible'

function stubVisibility(): void {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => visibilityStateValue,
  })
}

describe('ProfileContent reading resume lifecycle', () => {
  beforeEach(() => {
    resetGospelClientStorageForTests()
    installTestBrowserStorage()
    visibilityStateValue = 'visible'
    stubVisibility()
    Object.defineProperty(window, 'scrollY', { value: 200, configurable: true, writable: true })
    jest.mocked(captureReadingPositionAtViewport).mockImplementation(() => ({
      anchorId: 'section-1-0',
      plainOffset: 0,
      fingerprint: 'fp-shallow',
      excerpt: '',
    }))
    jest.mocked(isReadingPositionFingerprintValid).mockReturnValue(true)
    jest.mocked(restoreReadingPosition).mockImplementation(() => () => {})
    ;(global as any).fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: async () => ({}) })
    ) as any
  })

  test('visibility hidden persists reading resume', async () => {
    renderWithTextSize(
      <ProfileContent
        sections={sectionsPayload as any}
        profileInfo={{ title: 'Default', slug: 'default', favoriteScriptures: [] }}
        profile={{ id: 'd', isDefault: true } as any}
      />
    )
    await flushMountReadingResumeTimer()

    visibilityStateValue = 'hidden'
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    await waitFor(() => {
      expect(loadProfileReadingResume('default')).toEqual({
        v: 1,
        anchorId: 'section-1-0',
        plainOffset: 0,
        fingerprint: 'fp-shallow',
      })
    })
  })

  test('visibility visible restores when scroll is at top and resume exists', async () => {
    saveProfileReadingResume('default', 'section-2-0', 80, 'fp-deep')
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })

    renderWithTextSize(
      <ProfileContent
        sections={sectionsPayload as any}
        profileInfo={{ title: 'Default', slug: 'default', favoriteScriptures: [] }}
        profile={{ id: 'd', isDefault: true } as any}
      />
    )
    await flushMountReadingResumeTimer()
    jest.mocked(restoreReadingPosition).mockClear()

    visibilityStateValue = 'visible'
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    await waitFor(() => {
      expect(restoreReadingPosition).toHaveBeenCalled()
    })
  })

  test('visibility hide at scroll top does not overwrite deeper resume in a later section', async () => {
    saveProfileReadingResume('default', 'section-2-0', 500, 'fp-deep')
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
    jest.mocked(captureReadingPositionAtViewport).mockReturnValue({
      anchorId: 'section-1-0',
      plainOffset: 0,
      fingerprint: 'fp-shallow',
      excerpt: '',
    })

    renderWithTextSize(
      <ProfileContent
        sections={sectionsPayload as any}
        profileInfo={{ title: 'Default', slug: 'default', favoriteScriptures: [] }}
        profile={{ id: 'd', isDefault: true } as any}
      />
    )
    await flushMountReadingResumeTimer()

    visibilityStateValue = 'hidden'
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(loadProfileReadingResume('default')).toEqual({
      v: 1,
      anchorId: 'section-2-0',
      plainOffset: 500,
      fingerprint: 'fp-deep',
    })
  })

  test('switching profiles clears in-memory resume so scroll-top guard does not cross profiles', async () => {
    const profile = { id: 'p', isDefault: false }
    const captureMock = jest.mocked(captureReadingPositionAtViewport)

    const { rerender } = renderWithTextSize(
      <ProfileContent
        sections={sectionsPayload as any}
        profileInfo={{ title: 'Profile One', slug: 'p1', favoriteScriptures: [] }}
        profile={profile as any}
      />
    )
    await flushMountReadingResumeTimer()

    captureMock.mockReturnValue({
      anchorId: 'section-2-0',
      plainOffset: 500,
      fingerprint: 'fp-deep-p1',
      excerpt: '',
    })
    Object.defineProperty(window, 'scrollY', { value: 200, configurable: true, writable: true })
    visibilityStateValue = 'hidden'
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(loadProfileReadingResume('p1')?.plainOffset).toBe(500)

    visibilityStateValue = 'visible'
    rerender(
      <TextSizeProvider>
        <ProfileContent
          sections={sectionsPayload as any}
          profileInfo={{ title: 'Profile Two', slug: 'p2', favoriteScriptures: [] }}
          profile={profile as any}
        />
      </TextSizeProvider>
    )
    await flushMountReadingResumeTimer()

    captureMock.mockReturnValue({
      anchorId: 'section-1-0',
      plainOffset: 0,
      fingerprint: 'fp-shallow-p2',
      excerpt: '',
    })
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true })
    visibilityStateValue = 'hidden'
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(loadProfileReadingResume('p2')).toEqual({
      v: 1,
      anchorId: 'section-1-0',
      plainOffset: 0,
      fingerprint: 'fp-shallow-p2',
    })
  })
})
