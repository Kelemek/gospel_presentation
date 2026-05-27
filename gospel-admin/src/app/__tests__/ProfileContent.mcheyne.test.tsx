/**
 * @jest-environment jsdom
 */

import React, { type ReactElement } from 'react'
import { render, waitFor } from '@testing-library/react'
import { TextSizeProvider } from '@/contexts/TextSizeContext'
import { assignYellowLastViewed, versePinStorageKey } from '@/lib/versePinStorage'
import { gospelStorageGetSync, resetGospelClientStorageForTests } from '@/lib/gospelClientStorage'
import { installTestLocalStorage } from '@/lib/testing/testLocalStorage'
import { scrollToVersePinWhenReady } from '@/lib/scrollToVersePinWhenReady'

jest.mock('@/lib/scrollToVersePinWhenReady', () => ({
  scrollToVersePinWhenReady: jest.fn(() => () => {}),
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

describe('ProfileContent M\'Cheyne resume', () => {
  test('auto-scrolls to yellow pin on mchy when no hash or studyRef', async () => {
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
      expect(scrollToVersePinWhenReady).toHaveBeenCalledWith(
        expect.objectContaining({
          reference: 'Genesis 1',
          subsectionId: 'section-jan-1',
        }),
        expect.objectContaining({ behavior: 'auto' })
      )
    })
  })

  test('does not auto-scroll when studyRef is set', async () => {
    profileSearchParams = new URLSearchParams('studyRef=John+3%3A16')
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
      expect(scrollToVersePinWhenReady).not.toHaveBeenCalled()
    })
  })

  test('does not auto-scroll when hash deep link is present', async () => {
    window.location.hash = '#section-jan-0'
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
})
