/**
 * @jest-environment jsdom
 */

import React, { type ReactElement } from 'react'
import { render, waitFor } from '@testing-library/react'
import { TextSizeProvider } from '@/contexts/TextSizeContext'
import { assignYellowLastViewed, versePinStorageKey } from '@/lib/versePinStorage'
import { resetGospelClientStorageForTests } from '@/lib/gospelClientStorage'
import {
  setPendingMcheynePlanDay,
  setPendingMcheyneResumePin,
} from '@/lib/mcheyne/mcheynePendingNavigation'
import { installTestLocalStorage } from '@/lib/testing/testLocalStorage'
import { scrollToVersePinWhenReady } from '@/lib/scrollToVersePinWhenReady'
import { scrollToTocAnchorWhenReady } from '@/lib/scrollToTocAnchor'

jest.mock('@/lib/scrollToVersePinWhenReady', () => ({
  scrollToVersePinWhenReady: jest.fn((...args: unknown[]) => {
    const opts = args[1] as { onDone?: () => void } | undefined
    opts?.onDone?.()
    return () => {}
  }),
}))

jest.mock('@/lib/scrollToTocAnchor', () => ({
  scrollToTocAnchor: jest.fn(() => false),
  scrollToTocAnchorWhenReady: jest.fn((...args: unknown[]) => {
    const opts = args[1] as { onDone?: () => void } | undefined
    opts?.onDone?.()
    return () => {}
  }),
}))

jest.mock('@/lib/versePinStorage', () => {
  const actual = jest.requireActual('@/lib/versePinStorage')
  return {
    ...actual,
    hydrateVersePinsFromStorage: jest.fn(async (slug: string) => actual.loadVersePins(slug)),
  }
})

jest.mock('@/contexts/TranslationContext', () => ({
  __esModule: true,
  useTranslation: () => ({
    translation: 'esv',
    setTranslation: jest.fn(() => Promise.resolve()),
    isLoading: false,
    enabledTranslations: ['esv'],
    enabledTranslationOptions: [{ translation_code: 'esv', translation_name: 'ESV' }],
  }),
  TranslationProvider: ({ children }: { children: React.ReactNode }) => children,
}))

jest.mock('@/lib/supabase/client', () => ({
  __esModule: true,
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: null } }) },
  }),
}))

jest.mock('@/components/ThemeToggle', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/BookmarksDropdown', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/SidebarAuthNav', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/ProfileHelpMenu', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/PresentationFirstVisitWelcome', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/MemorizationPracticeSession', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/TableOfContents', () => ({
  __esModule: true,
  default: () => <div data-testid="toc" />,
}))

let profileSearchParams = new URLSearchParams()

function syncProfileNavigationTestGlobals() {
  ;(globalThis as typeof globalThis & { __testSearchParams?: URLSearchParams }).__testSearchParams =
    profileSearchParams
  ;(globalThis as typeof globalThis & { __testPathname?: string }).__testPathname = '/mchy'
}

function renderWithTextSize(ui: ReactElement) {
  return render(<TextSizeProvider>{ui}</TextSizeProvider>)
}

const mchySections = [
  {
    section: 'jan',
    title: 'January',
    subsections: [
      { title: 'About this plan', content: 'intro', questions: [] },
      {
        title: 'Day 1 — January 1',
        content: '',
        nestedSubsections: [
          {
            title: 'Family',
            content: '',
            scriptureReferences: [{ reference: 'Genesis 1', favorite: false }],
            questions: [],
          },
        ],
        questions: [],
      },
    ],
  },
]

beforeEach(() => {
  jest.clearAllMocks()
  profileSearchParams = new URLSearchParams()
  syncProfileNavigationTestGlobals()
  resetGospelClientStorageForTests()
  installTestLocalStorage()
  window.location.hash = ''
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, json: async () => ({}) })
  ) as unknown as typeof fetch
})

afterEach(() => {
  const g = globalThis as Omit<typeof globalThis, 'fetch'> & { fetch?: typeof fetch }
  delete g.fetch
})

describe('ProfileContent M\'Cheyne navigation', () => {
  test('does not auto-scroll to yellow pin on open without query params', async () => {
    assignYellowLastViewed('mchy', {
      reference: 'Genesis 1',
      sectionId: 'section-jan',
      subsectionId: 'section-jan-1',
    })

    const { ProfileContent } = await import('../[slug]/ProfileContent')
    renderWithTextSize(
      <ProfileContent
        sections={mchySections as any}
        profileInfo={{ title: "M'Cheyne", slug: 'mchy', favoriteScriptures: [] }}
      />
    )

    await waitFor(() => {
      expect(scrollToVersePinWhenReady).not.toHaveBeenCalled()
    })
  })

  test('scrolls to plan day when ?planDay=1', async () => {
    profileSearchParams = new URLSearchParams('planDay=1')
    syncProfileNavigationTestGlobals()

    const { ProfileContent } = await import('../[slug]/ProfileContent')
    renderWithTextSize(
      <ProfileContent
        sections={mchySections as any}
        profileInfo={{ title: "M'Cheyne", slug: 'mchy', favoriteScriptures: [] }}
      />
    )

    await waitFor(() => {
      expect(scrollToTocAnchorWhenReady).toHaveBeenCalledWith(
        'section-jan-1',
        expect.objectContaining({ behavior: 'auto', preferSubsectionTitle: true })
      )
    })
  })

  test('scrolls to day title once when ?resumePin=1 with duplicate pending', async () => {
    setPendingMcheyneResumePin()
    profileSearchParams = new URLSearchParams('resumePin=1')
    syncProfileNavigationTestGlobals()
    assignYellowLastViewed('mchy', {
      reference: 'Genesis 1',
      sectionId: 'section-jan',
      subsectionId: 'section-jan-1',
    })
    expect(localStorage.getItem(versePinStorageKey('mchy'))).toBeTruthy()

    const { ProfileContent } = await import('../[slug]/ProfileContent')
    renderWithTextSize(
      <ProfileContent
        sections={mchySections as any}
        profileInfo={{ title: "M'Cheyne", slug: 'mchy', favoriteScriptures: [] }}
      />
    )

    await waitFor(() => {
      expect(scrollToTocAnchorWhenReady).toHaveBeenCalledTimes(1)
      expect(scrollToTocAnchorWhenReady).toHaveBeenCalledWith(
        'section-jan-1',
        expect.objectContaining({ behavior: 'auto', preferSubsectionTitle: true })
      )
      expect(scrollToVersePinWhenReady).not.toHaveBeenCalled()
    })
  })

  test('invalid planDay param preserves pending then scrolls when param clears', async () => {
    setPendingMcheynePlanDay(1)
    profileSearchParams = new URLSearchParams('planDay=0')
    syncProfileNavigationTestGlobals()

    const { ProfileContent } = await import('../[slug]/ProfileContent')
    const view = renderWithTextSize(
      <ProfileContent
        sections={mchySections as any}
        profileInfo={{ title: "M'Cheyne", slug: 'mchy', favoriteScriptures: [] }}
      />
    )

    await waitFor(() => {
      expect(scrollToTocAnchorWhenReady).not.toHaveBeenCalled()
    })

    profileSearchParams = new URLSearchParams()
    syncProfileNavigationTestGlobals()
    view.rerender(
      <TextSizeProvider>
        <ProfileContent
          sections={mchySections as any}
          profileInfo={{ title: "M'Cheyne", slug: 'mchy', favoriteScriptures: [] }}
        />
      </TextSizeProvider>
    )

    await waitFor(() => {
      expect(scrollToTocAnchorWhenReady).toHaveBeenCalledWith(
        'section-jan-1',
        expect.objectContaining({ behavior: 'auto', preferSubsectionTitle: true })
      )
    })
  })

  test('does not scroll for resumePin when studyRef is set', async () => {
    profileSearchParams = new URLSearchParams('resumePin=1&studyRef=John+3%3A16')
    syncProfileNavigationTestGlobals()
    assignYellowLastViewed('mchy', {
      reference: 'Genesis 1',
      sectionId: 'section-jan',
      subsectionId: 'section-jan-1',
    })

    const { ProfileContent } = await import('../[slug]/ProfileContent')
    renderWithTextSize(
      <ProfileContent
        sections={mchySections as any}
        profileInfo={{ title: "M'Cheyne", slug: 'mchy', favoriteScriptures: [] }}
      />
    )

    await waitFor(() => {
      expect(scrollToTocAnchorWhenReady).not.toHaveBeenCalled()
      expect(scrollToVersePinWhenReady).not.toHaveBeenCalled()
    })
  })
})
