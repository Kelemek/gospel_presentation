import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'

// Mock the modal only so we can assert its open state. Use the real GospelSection
jest.mock('@/components/ScriptureModal', () => ({ __esModule: true, default: ({ isOpen }: any) => <div data-testid="scripture-modal">Modal open: {String(!!isOpen)}</div> }))

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

beforeEach(() => {
  jest.clearAllMocks()
  // Default fetch mock to accept visit tracking and other calls
  // @ts-ignore
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: async () => ({}) }))
  lastViewedValue = null
})

afterEach(() => {
  // @ts-ignore
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
