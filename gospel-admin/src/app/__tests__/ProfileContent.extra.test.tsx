import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('@/lib/supabase/client', () => ({
  __esModule: true,
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'user@example.com' } } }) },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'counselor' } }) }) }) }),
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

beforeEach(() => {
  jest.clearAllMocks()
  localStorage.clear()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  global.fetch = jest.fn((input: RequestInfo | URL | any) => {
    const url = typeof input === 'string' ? input : String(input)
    if (url.includes('/visit')) return Promise.resolve({ ok: true, json: async () => ({}) }) as any
    if (url.includes('/api/scripture')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ text: '[1] In the beginning' }),
      }) as unknown as Response
    }
    return Promise.resolve({ ok: true, json: async () => ({}) }) as unknown as Response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any
})

afterEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (global as any).fetch
})

describe('ProfileContent extra interactions', () => {
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

    render(<ProfileContent sections={sections as any} profileInfo={profileInfo as any} profile={profile as any} />)

    const btn = await screen.findByRole('button', { name: /^John 3:16$/i })
    await user.click(btn)

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /john 3:16/i })).toBeInTheDocument()
    )
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

    render(<ProfileContent sections={sections as any} profileInfo={profileInfo as any} profile={profile as any} />)

    await user.click(await screen.findByRole('button', { name: /^John 3:16$/i }))

    await user.click(await screen.findByRole('button', { name: /^Pin color:/i }))
    await user.click(screen.getByRole('option', { name: /^Red pin$/i }))

    await user.click(screen.getByRole('button', { name: /close modal/i }))

    const raw = localStorage.getItem('gospel-verse-pins-p1')
    expect(raw).toBeTruthy()
    expect(raw).toContain('John 3:16')
    expect(raw).toContain('red')
    expect(JSON.parse(raw!).byColor.red.reference).toBe('John 3:16')
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

    render(<ProfileContent sections={sections as any} profileInfo={profileInfo as any} profile={profile as any} />)

    await user.click(await screen.findByRole('button', { name: /^John 3:16$/i }))
    await screen.findByRole('button', { name: /^Pin color:/i })
    await user.click(screen.getByRole('button', { name: /close modal/i }))

    const raw = localStorage.getItem('gospel-verse-pins-p1')
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw!).byColor.yellow.reference).toBe('John 3:16')
  })
})
