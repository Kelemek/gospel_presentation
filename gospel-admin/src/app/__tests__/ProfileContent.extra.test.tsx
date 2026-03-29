import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'

// Mock modal: expose a control to fire onScriptureViewed like the real modal after fetch
jest.mock('@/components/ScriptureModal', () => ({
  __esModule: true,
  default: ({ isOpen, reference, onScriptureViewed, onNext, hasNext }: any) => (
    <div data-testid="scripture-modal">
      Modal open: {String(!!isOpen)}
      {isOpen && onScriptureViewed ? (
        <button type="button" data-testid="simulate-modal-viewed" onClick={() => onScriptureViewed(reference)}>
          viewed
        </button>
      ) : null}
      {isOpen && onNext && hasNext ? (
        <button type="button" data-testid="modal-next" onClick={() => onNext()}>
          next
        </button>
      ) : null}
    </div>
  ),
}))

// Mock supabase client auth used during checkAuth
jest.mock('@/lib/supabase/client', () => ({
  __esModule: true,
  createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'user@example.com' } } }) }, from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'counselor' } }) }) }) }) })
}))

// Spies and mutable last-viewed value used by the mock hook implementation
const trackSpy = jest.fn().mockResolvedValue(undefined)
const resetSpy = jest.fn().mockResolvedValue(undefined)
let lastViewedValue: { reference: string } | null = null

jest.mock('@/lib/useScriptureProgress', () => ({
  __esModule: true,
  useScriptureProgress: () => ({
    trackScriptureView: trackSpy,
    resetProgress: resetSpy,
    get lastViewedScripture() { return lastViewedValue },
    isLoading: false,
    error: null
  })
}))

const refreshMock = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: refreshMock, push: jest.fn() }) }))

jest.mock('@/components/ThemeToggle', () => ({ __esModule: true, default: () => null }))

jest.mock('@/components/BookmarksDropdown', () => ({ __esModule: true, default: () => null }))

beforeEach(() => {
  jest.clearAllMocks()
  // Default fetch mock to accept visit tracking and other calls
  // @ts-expect-error mocking incompatible types
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: async () => ({}) }))
  lastViewedValue = null
})

afterEach(() => {
  // @ts-expect-error mocking incompatible types
  global.fetch = undefined
})

describe('ProfileContent extra interactions', () => {
  test('clicking a scripture triggers tracking and opens modal', async () => {
    const { ProfileContent } = await import('../[slug]/ProfileContent')

    const sections = [
      {
        section: '1',
        title: 'Intro',
        subsections: [
          { title: 'Sub', content: 'c', scriptureReferences: [{ reference: 'John 3:16', favorite: false }], nestedSubsections: [] }
        ]
      }
    ]

    const profileInfo = { title: 'P', slug: 'p1', favoriteScriptures: [] }
    const profile = { id: 'p1', slug: 'p1', isDefault: false }

    render(<ProfileContent sections={sections as any} profileInfo={profileInfo as any} profile={profile as any} />)

    // Wait for scripture button and click it
    const btn = await screen.findByText(/John 3:16/)
    btn.click()

    // trackScriptureView should be called and modal should open
    await waitFor(() => expect(trackSpy).toHaveBeenCalled())
    expect(screen.getByTestId('scripture-modal')).toHaveTextContent('Modal open: true')
  })

  test('modal onScriptureViewed tracks real card anchors (not modal-view) for duplicate references', async () => {
    const { ProfileContent } = await import('../[slug]/ProfileContent')

    const sections = [
      {
        section: '1',
        title: 'Intro',
        subsections: [
          { title: 'A', content: 'c', scriptureReferences: [{ reference: 'Rom 8:28', favorite: false }], nestedSubsections: [] },
          { title: 'B', content: 'c', scriptureReferences: [{ reference: 'Rom 8:28', favorite: false }], nestedSubsections: [] },
        ],
      },
    ]

    const profileInfo = { title: 'P', slug: 'p1', favoriteScriptures: [] }
    const profile = { id: 'p1', slug: 'p1', isDefault: false }

    render(<ProfileContent sections={sections as any} profileInfo={profileInfo as any} profile={profile as any} />)

    const romButtons = await screen.findAllByRole('button', { name: /^Rom 8:28$/i })
    romButtons[1]!.click()

    await waitFor(() => expect(trackSpy).toHaveBeenCalled())
    expect(trackSpy).toHaveBeenCalledWith('Rom 8:28', 'section-1', 'section-1-1')

    trackSpy.mockClear()
    fireEvent.click(screen.getByTestId('simulate-modal-viewed'))

    await waitFor(() => expect(trackSpy).toHaveBeenCalled())
    expect(trackSpy).toHaveBeenCalledWith('Rom 8:28', 'section-1', 'section-1-1')
    expect(trackSpy).not.toHaveBeenCalledWith('Rom 8:28', 'modal-view', 'modal-view')
  })

  test('modal next lands on the second duplicate card with matching anchors', async () => {
    const { ProfileContent } = await import('../[slug]/ProfileContent')

    const sections = [
      {
        section: '1',
        title: 'Intro',
        subsections: [
          { title: 'A', content: 'c', scriptureReferences: [{ reference: 'Rom 8:28', favorite: false }], nestedSubsections: [] },
          { title: 'Mid', content: 'c', scriptureReferences: [{ reference: 'John 3:16', favorite: false }], nestedSubsections: [] },
          { title: 'B', content: 'c', scriptureReferences: [{ reference: 'Rom 8:28', favorite: false }], nestedSubsections: [] },
        ],
      },
    ]

    const profileInfo = { title: 'P', slug: 'p1', favoriteScriptures: [] }
    const profile = { id: 'p1', slug: 'p1', isDefault: false }

    render(<ProfileContent sections={sections as any} profileInfo={profileInfo as any} profile={profile as any} />)

    const romButtons = await screen.findAllByRole('button', { name: /^Rom 8:28$/i })
    romButtons[0]!.click()
    await waitFor(() => expect(trackSpy).toHaveBeenCalled())

    fireEvent.click(screen.getByTestId('modal-next'))
    await waitFor(() => expect(trackSpy).toHaveBeenCalledWith('John 3:16', 'section-1', 'section-1-1'))

    trackSpy.mockClear()
    fireEvent.click(screen.getByTestId('modal-next'))
    await waitFor(() => expect(trackSpy).toHaveBeenCalled())
    expect(trackSpy).toHaveBeenCalledWith('Rom 8:28', 'section-1', 'section-1-2')
    expect(trackSpy).not.toHaveBeenCalledWith('Rom 8:28', 'section-1', 'section-1-0')
  })

  test('reset progress button calls resetProgress and refresh', async () => {
    const { ProfileContent } = await import('../[slug]/ProfileContent')

    // Set lastViewed so the Reset button is rendered
    lastViewedValue = { reference: 'John 3:16' }

    const sections = [
      {
        section: '1',
        title: 'Intro',
        subsections: [
          { title: 'Sub', content: 'c', scriptureReferences: [{ reference: 'John 3:16', favorite: false }], nestedSubsections: [] }
        ]
      }
    ]

    const profileInfo = { title: 'P', slug: 'p1', favoriteScriptures: [] }
    const profile = { id: 'p1', slug: 'p1', isDefault: false }

    render(<ProfileContent sections={sections as any} profileInfo={profileInfo as any} profile={profile as any} />)

  // Click the pin (title="Click to clear progress") which triggers onClearProgress
  const pin = await screen.findByTitle('Click to clear progress')
  pin.click()

  await waitFor(() => expect(resetSpy).toHaveBeenCalled())
  expect(refreshMock).toHaveBeenCalled()
  })
})
