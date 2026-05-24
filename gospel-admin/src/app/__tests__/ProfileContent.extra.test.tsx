import React, { type ReactElement } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TextSizeProvider } from '@/contexts/TextSizeContext'
import { gospelStorageGetSync, resetGospelClientStorageForTests } from '@/lib/gospelClientStorage'
import { loadVersePins, versePinStorageKey } from '@/lib/versePinStorage'
import { installTestLocalStorage } from '@/lib/testing/testLocalStorage'

const mockSetTranslation = jest.fn(() => Promise.resolve())
let mockTranslationsLoading = false

jest.mock('@/contexts/TranslationContext', () => ({
  __esModule: true,
  useTranslation: () => ({
    translation: 'esv',
    setTranslation: mockSetTranslation,
    get isLoading() {
      return mockTranslationsLoading
    },
    enabledTranslations: ['esv', 'kjv', 'nasb'],
    enabledTranslationOptions: [
      { translation_code: 'esv', translation_name: 'ESV (English Standard Version)' },
      { translation_code: 'kjv', translation_name: 'KJV (King James Version)' },
      { translation_code: 'nasb', translation_name: 'NASB (New American Standard Bible)' },
    ],
  }),
  TranslationProvider: ({ children }: { children: React.ReactNode }) => children,
}))

function renderWithTextSize(ui: ReactElement) {
  return render(<TextSizeProvider>{ui}</TextSizeProvider>)
}

jest.mock('@/lib/supabase/client', () => ({
  __esModule: true,
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'user@example.com' } } }) },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'admin' } }) }) }) }),
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
  ;(globalThis as typeof globalThis & { __testPathname?: string }).__testPathname = '/default'
}

beforeEach(() => {
  jest.clearAllMocks()
  mockTranslationsLoading = false
  mockSetTranslation.mockImplementation(() => Promise.resolve())
  profileSearchParams = new URLSearchParams()
  syncProfileNavigationTestGlobals()
  resetGospelClientStorageForTests()
  installTestLocalStorage()
  global.fetch = jest.fn((input: Parameters<typeof fetch>[0]) => {
    const url = typeof input === 'string' ? input : String(input)
    if (url.includes('/visit')) {
      return Promise.resolve({ ok: true, json: async () => ({}) }) as unknown as Response
    }
    if (url.includes('/api/scripture/spurgeon-links')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ items: [] }),
      }) as unknown as Response
    }
    if (url.includes('/api/scripture')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ text: '[1] In the beginning' }),
      }) as unknown as Response
    }
    return Promise.resolve({ ok: true, json: async () => ({}) }) as unknown as Response
  }) as unknown as typeof fetch
})

afterEach(() => {
  const g = globalThis as Omit<typeof globalThis, 'fetch'> & { fetch?: typeof fetch }
  delete g.fetch
})

describe('ProfileContent extra interactions', () => {
  test('opens scripture modal from ?scriptureRef= deep link', async () => {
    profileSearchParams = new URLSearchParams('scriptureRef=John+3%3A16')
    syncProfileNavigationTestGlobals()
    const { ProfileContent } = await import('../[slug]/ProfileContent')

    const sections = [
      {
        section: '1',
        title: 'Intro',
        subsections: [
          {
            title: 'Sub',
            content: 'c',
            scriptureReferences: [{ reference: 'John 3:16', favorite: false }],
            nestedSubsections: [],
          },
        ],
      },
    ]

    const profileInfo = { title: 'Default', slug: 'default', favoriteScriptures: [] }
    const profile = { id: 'd1', slug: 'default', isDefault: true }

    renderWithTextSize(
      <ProfileContent sections={sections as any} profileInfo={profileInfo as any} profile={profile as any} />
    )

    expect(await screen.findByRole('heading', { name: /john 3:16/i })).toBeInTheDocument()
  })

  test('applies ?translation= after enabled translations finish loading', async () => {
    mockTranslationsLoading = true
    profileSearchParams = new URLSearchParams('scriptureRef=John+3%3A16&translation=kjv')
    syncProfileNavigationTestGlobals()
    const { ProfileContent } = await import('../[slug]/ProfileContent')

    const sections = [
      {
        section: '1',
        title: 'Intro',
        subsections: [
          {
            title: 'Sub',
            content: 'c',
            scriptureReferences: [{ reference: 'John 3:16', favorite: false }],
            nestedSubsections: [],
          },
        ],
      },
    ]
    const profileInfo = { title: 'Default', slug: 'default', favoriteScriptures: [] }
    const profile = { id: 'd1', slug: 'default', isDefault: true }
    const props = {
      sections: sections as any,
      profileInfo: profileInfo as any,
      profile: profile as any,
    }

    const { rerender } = renderWithTextSize(<ProfileContent {...props} />)

    expect(screen.queryByRole('heading', { name: /john 3:16/i })).not.toBeInTheDocument()
    expect(mockSetTranslation).not.toHaveBeenCalled()

    mockTranslationsLoading = false
    syncProfileNavigationTestGlobals()
    rerender(
      <TextSizeProvider>
        <ProfileContent {...props} />
      </TextSizeProvider>
    )

    await waitFor(() => expect(mockSetTranslation).toHaveBeenCalledWith('kjv'))
    expect(await screen.findByRole('heading', { name: /john 3:16/i })).toBeInTheDocument()
  })

  test('opening a scripture loads the modal', async () => {
    const { ProfileContent } = await import('../[slug]/ProfileContent')
    const user = userEvent.setup()

    const sections = [
      {
        section: '1',
        title: 'Intro',
        subsections: [
          {
            title: 'Sub',
            content: 'c',
            scriptureReferences: [{ reference: 'John 3:16', favorite: false }],
            nestedSubsections: [],
          },
        ],
      },
    ]

    const profileInfo = { title: 'P', slug: 'p1', favoriteScriptures: [] }
    const profile = { id: 'p1', slug: 'p1', isDefault: false }

    renderWithTextSize(<ProfileContent sections={sections as any} profileInfo={profileInfo as any} profile={profile as any} />)

    const btn = await screen.findByRole('button', { name: /^John 3:16$/i })
    await user.click(btn)

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /john 3:16/i })).toBeInTheDocument()
    )
    const loc = screen.getByTestId('scripture-modal-presentation-location')
    expect(loc).toHaveTextContent('Intro')
    expect(loc).toHaveTextContent('Sub')
  })

  test('opening scripture on a nested subsection shows parent then nested title in the modal strip', async () => {
    const { ProfileContent } = await import('../[slug]/ProfileContent')
    const user = userEvent.setup()

    const sections = [
      {
        section: '1',
        title: 'Intro',
        subsections: [
          {
            title: 'Sub',
            content: 'c',
            scriptureReferences: [],
            nestedSubsections: [
              {
                title: 'Deep',
                content: 'd',
                scriptureReferences: [{ reference: 'Romans 1:1', favorite: false }],
              },
            ],
          },
        ],
      },
    ]

    const profileInfo = { title: 'P', slug: 'p1', favoriteScriptures: [] }
    const profile = { id: 'p1', slug: 'p1', isDefault: false }

    renderWithTextSize(<ProfileContent sections={sections as any} profileInfo={profileInfo as any} profile={profile as any} />)

    await user.click(await screen.findByRole('button', { name: /^Romans 1:1$/i }))

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /romans 1:1/i })).toBeInTheDocument()
    )
    const loc = screen.getByTestId('scripture-modal-presentation-location')
    expect(loc).toHaveTextContent('Intro')
    expect(loc).toHaveTextContent('Sub')
    expect(loc).toHaveTextContent('Deep')
    expect(within(loc).getByText('Deep')).toHaveClass('pl-6')
  })

  test('inline-only scripture in subsection body still shows modal where-you-are strip', async () => {
    const { ProfileContent } = await import('../[slug]/ProfileContent')
    const user = userEvent.setup()

    const sections = [
      {
        section: '9',
        title: 'Main Sermon',
        subsections: [
          {
            title: 'Exposition',
            content: '<p>Read John 3:16 for yourself.</p>',
            scriptureReferences: [],
            nestedSubsections: [],
          },
        ],
      },
    ]

    const profileInfo = { title: 'Spurgeon 123', slug: 'sg0123', favoriteScriptures: [] }
    const profile = { id: 'x', slug: 'sg0123', isDefault: false }

    renderWithTextSize(<ProfileContent sections={sections as any} profileInfo={profileInfo as any} profile={profile as any} />)

    await user.click(await screen.findByRole('button', { name: /^John 3:16$/i }))

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /john 3:16/i })).toBeInTheDocument()
    )
    const loc = screen.getByTestId('scripture-modal-presentation-location')
    expect(loc).toHaveTextContent('Main Sermon')
    expect(loc).toHaveTextContent('Exposition')
  })

  test('closing the modal persists a verse pin chosen from the icon picker (localStorage)', async () => {
    const { ProfileContent } = await import('../[slug]/ProfileContent')
    const user = userEvent.setup()

    const sections = [
      {
        section: '1',
        title: 'Intro',
        subsections: [
          {
            title: 'Sub',
            content: 'c',
            scriptureReferences: [{ reference: 'John 3:16', favorite: false }],
            nestedSubsections: [],
          },
        ],
      },
    ]

    const profileInfo = { title: 'P', slug: 'p1', favoriteScriptures: [] }
    const profile = { id: 'p1', slug: 'p1', isDefault: false }

    renderWithTextSize(<ProfileContent sections={sections as any} profileInfo={profileInfo as any} profile={profile as any} />)

    await user.click(await screen.findByRole('button', { name: /^John 3:16$/i }))

    await user.click(await screen.findByRole('button', { name: /^Pin color:/i }))
    await user.click(screen.getByRole('option', { name: /^Red pin$/i }))

    await user.click(screen.getByRole('button', { name: /close modal/i }))

    await waitFor(() => {
      const raw = gospelStorageGetSync(versePinStorageKey('p1'))
      expect(raw).toBeTruthy()
      expect(raw).toContain('John 3:16')
      expect(raw).toContain('red')
    })
    const raw = gospelStorageGetSync(versePinStorageKey('p1'))!
    const parsed = JSON.parse(raw) as { v: number; bookmarks: Array<{ colorId: string; reference: string }> }
    expect(parsed.v).toBe(2)
    expect(parsed.bookmarks.some((b) => b.colorId === 'red' && b.reference === 'John 3:16')).toBe(true)
  })

  test('closing without changing Pin updates yellow slot as last verse viewed (localStorage)', async () => {
    const { ProfileContent } = await import('../[slug]/ProfileContent')
    const user = userEvent.setup()

    const sections = [
      {
        section: '1',
        title: 'Intro',
        subsections: [
          {
            title: 'Sub',
            content: 'c',
            scriptureReferences: [{ reference: 'John 3:16', favorite: false }],
            nestedSubsections: [],
          },
        ],
      },
    ]

    const profileInfo = { title: 'P', slug: 'p1', favoriteScriptures: [] }
    const profile = { id: 'p1', slug: 'p1', isDefault: false }

    renderWithTextSize(<ProfileContent sections={sections as any} profileInfo={profileInfo as any} profile={profile as any} />)

    await user.click(await screen.findByRole('button', { name: /^John 3:16$/i }))
    await screen.findByRole('button', { name: /^Pin color:/i })
    await user.click(screen.getByRole('button', { name: /close modal/i }))

    await waitFor(() => {
      expect(loadVersePins('p1').yellow?.reference).toBe('John 3:16')
    })
  })
})
