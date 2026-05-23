/**
 * Navigation + scripture modal smoke tests (pins are localStorage-only).
 */
import React, { type ReactElement } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TextSizeProvider } from '@/contexts/TextSizeContext'
import { gospelStorageGetSync, gospelStorageSetSync, resetGospelClientStorageForTests } from '@/lib/gospelClientStorage'
import { versePinStorageKey } from '@/lib/versePinStorage'
import { installTestLocalStorage } from '@/lib/testing/testLocalStorage'

function renderWithTextSize(ui: ReactElement) {
  return render(<TextSizeProvider>{ui}</TextSizeProvider>)
}

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
        scriptureReferences: [
          { reference: 'John 3:16', favorite: false },
          { reference: 'John 4:1', favorite: false },
        ],
      },
    ],
  },
]

const profileInfo = {
  title: 'Profile',
  slug: 'p1',
  favoriteScriptures: [],
}

describe('ProfileContent navigation & pins', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetGospelClientStorageForTests()
    installTestLocalStorage()
    ;(global as any).fetch = jest.fn((input: RequestInfo | URL | any) => {
      const url = typeof input === 'string' ? input : String(input)
      if (url.includes('/visit')) return Promise.resolve({ ok: true, json: async () => ({}) }) as any
      if (url.includes('/api/scripture')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ text: '[1] Scripture text.' }),
        }) as unknown as Response
      }
      return Promise.resolve({ ok: true, json: async () => ({}) }) as unknown as Response
    }) as any
  })

  test('clicking scripture opens modal', async () => {
    const user = userEvent.setup()
    const profile = { id: 'p', isDefault: false }

    renderWithTextSize(<ProfileContent sections={sectionsPayload as any} profileInfo={profileInfo as any} profile={profile as any} />)

    const john = await screen.findByRole('button', { name: /^John 3:16$/i })
    await user.click(john)

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /john 3:16/i })).toBeInTheDocument()
    )
  })

  test('removing verse pin invokes onRemove handler', async () => {
    const user = userEvent.setup()
    const profile = { id: 'p', isDefault: false }

    gospelStorageSetSync(
      versePinStorageKey('p1'),
      JSON.stringify({
        v: 2,
        yellow: null,
        bookmarks: [
          {
            id: 'bm-red-1',
            colorId: 'red',
            reference: 'John 3:16',
            sectionId: 'section-1',
            subsectionId: 'section-1-0',
          },
        ],
      })
    )

    renderWithTextSize(<ProfileContent sections={sectionsPayload as any} profileInfo={profileInfo as any} profile={profile as any} />)

    const unpinBtn = await screen.findByRole('button', { name: /remove red pin/i })
    await user.click(unpinBtn)

    await waitFor(() => expect(gospelStorageGetSync(versePinStorageKey('p1'))).toBeNull())
  })
})
