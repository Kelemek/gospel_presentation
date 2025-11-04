/**
 * Tests for ProfileContent navigation and progress interactions.
 *
 * - Mocks `useScriptureProgress` to capture calls to trackScriptureView/resetProgress
 * - Renders ProfileContent with a minimal sections payload
 */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Create mutable mocks that the jest.mock factory below will close over.
const trackMock = jest.fn()
const resetMock = jest.fn()
let lastViewed: { reference: string | null } = { reference: null }

jest.mock('@/lib/useScriptureProgress', () => ({
  useScriptureProgress: (_profile: any) => ({
    trackScriptureView: trackMock,
    resetProgress: resetMock,
    lastViewedScripture: lastViewed.reference ? { reference: lastViewed.reference } : null,
    isLoading: false,
    error: null,
  })
}))

// Import after mocking hooks
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
          { reference: 'John 4:1', favorite: false }
        ]
      }
    ]
  }
]

const profileInfo = {
  title: 'Profile',
  slug: 'p1',
  favoriteScriptures: []
}

describe('ProfileContent navigation & progress', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Ensure unauthenticated by default; tests can set this localStorage marker
    // to simulate an authenticated user (the jest.setup client reads this).
    ;(global.localStorage as any).getItem = jest.fn(() => undefined)
    lastViewed.reference = null
  })

  test('clicking a scripture opens modal and calls trackScriptureView when profile is non-default', async () => {
  // Simulate an authenticated, non-default profile -> createClient.auth.getUser returns user
  ;(global.localStorage as any).getItem = jest.fn(() => JSON.stringify({ isAuthenticated: true, sessionToken: 't' }))

    // Provide a non-default profile object so tracking runs
    const profile = { id: 'p', isDefault: false }

    render(<ProfileContent sections={sectionsPayload as any} profileInfo={profileInfo as any} profile={profile as any} />)

  // Wait for scripture button to appear then click the first matching button
  const btns = await screen.findAllByRole('button', { name: /John 3:16/i })
  // The first matching button is the scripture button rendered inside GospelSection
  await userEvent.click(btns[0])

    // trackScriptureView should have been called once for the click
    await waitFor(() => expect(trackMock).toHaveBeenCalled())

    // The ScriptureModal should render the reference heading when open
  const heading = await screen.findByRole('heading', { name: /John 3:16/i })
    expect(heading).toBeInTheDocument()
  })

  test('clicking the last-viewed pin calls resetProgress', async () => {
    // Simulate a last-viewed scripture so the pin is rendered
  ;(global.localStorage as any).getItem = jest.fn(() => JSON.stringify({ isAuthenticated: true, sessionToken: 't' }))
  lastViewed.reference = 'John 3:16'

    const profile = { id: 'p', isDefault: false }

    render(<ProfileContent sections={sectionsPayload as any} profileInfo={profileInfo as any} profile={profile as any} />)

    // The pin button has a title 'Click to clear progress' - find it and click
    const pin = await screen.findByTitle(/Click to clear progress/i)
    await userEvent.click(pin)

    // resetProgress should have been invoked via the handler
    await waitFor(() => expect(resetMock).toHaveBeenCalled())
  })
})
