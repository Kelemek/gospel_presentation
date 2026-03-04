import React from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useScriptureProgress } from '../useScriptureProgress'

function TestHarness({ profile, isLoggedIn = false }: { profile: any; isLoggedIn?: boolean }) {
  const { trackScriptureView, resetProgress, lastViewedScripture, isLoading, error } = useScriptureProgress(profile, isLoggedIn)

  return (
    <div>
      <button onClick={() => trackScriptureView('John 3:16', 's1', 'ss1')}>track</button>
      <button onClick={() => resetProgress()}>reset</button>
      <div data-testid="loading">{isLoading ? 'loading' : 'idle'}</div>
      <div data-testid="error">{error || ''}</div>
      <div data-testid="last">{lastViewedScripture ? lastViewedScripture.reference : 'none'}</div>
    </div>
  )
}

describe('useScriptureProgress', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // default fetch returns ok true
    // @ts-expect-error mocking incompatible types
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: async () => ({}) }))
  })

  test('does not call fetch when profile is null or default', async () => {
    render(<TestHarness profile={null} />)
    const user = userEvent.setup()
    await user.click(screen.getByText('track'))
    expect(global.fetch).not.toHaveBeenCalled()

    // default profile (isDefault true) should also not call
    cleanup()
    render(<TestHarness profile={{ slug: 'p', isDefault: true }} />)
    await user.click(screen.getByText('track'))
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('does not call fetch when anonymous (isLoggedIn false) even for non-default profile', async () => {
    render(<TestHarness profile={{ slug: 'p1', isDefault: false }} />)
    const user = userEvent.setup()
    await user.click(screen.getByText('track'))
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('tracks scripture view successfully for non-default profile', async () => {
    const profile = { slug: 'p1', isDefault: false }
    // @ts-expect-error mocking incompatible types
    global.fetch = jest.fn((url, opts) => {
      expect(url).toContain(`/api/profiles/${profile.slug}/scripture-progress`)
      expect(opts && (opts as any).method).toBe('POST')
      return Promise.resolve({ ok: true })
    })

    render(<TestHarness profile={profile} isLoggedIn />)
    const user = userEvent.setup()
    await user.click(screen.getByText('track'))

    // wait for isLoading to settle
    await screen.findByTestId('loading')
    expect(global.fetch).toHaveBeenCalled()
  })

  test('resetProgress sets error when delete fails', async () => {
    const profile = { slug: 'p2', isDefault: false }
    // @ts-expect-error mocking incompatible types
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 500 }))

    render(<TestHarness profile={profile} isLoggedIn />)
    const user = userEvent.setup()
    await user.click(screen.getByText('reset'))

    // error should appear
    const err = await screen.findByTestId('error')
    expect(err.textContent).toMatch(/Failed to reset progress|Failed to track scripture progress|Failed to reset progress/i)
  })

  test('when logged in with profile.lastViewedScripture, initializes from DB and syncs to localStorage', async () => {
    const profile = {
      slug: 'p1',
      isDefault: false,
      lastViewedScripture: {
        reference: 'Gen 1:1',
        sectionId: 's1',
        subsectionId: 'ss1',
        viewedAt: new Date('2024-01-01')
      }
    }
    const getItem = jest.fn(() => null)
    const setItem = jest.fn()
    Object.defineProperty(global, 'localStorage', { value: { getItem, setItem, removeItem: jest.fn(), clear: jest.fn() }, writable: true })

    render(<TestHarness profile={profile} isLoggedIn />)
    expect(screen.getByTestId('last')).toHaveTextContent('Gen 1:1')
    expect(setItem).toHaveBeenCalled()
  })

  test('trackScriptureView sets error when POST fails', async () => {
    const profile = { slug: 'p3', isDefault: false }
    // @ts-expect-error mocking incompatible types
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 500 }))
    Object.defineProperty(global, 'localStorage', {
      value: { getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn(), clear: jest.fn() },
      writable: true
    })

    render(<TestHarness profile={profile} isLoggedIn />)
    const user = userEvent.setup()
    await user.click(screen.getByText('track'))
    const err = await screen.findByTestId('error')
    expect(err.textContent).toMatch(/Failed to track/)
  })

  test('resetProgress calls DELETE when logged in and non-default profile', async () => {
    const profile = { slug: 'p4', isDefault: false }
    const fetchMock = jest.fn((url: string, opts?: any) => {
      if (opts?.method === 'DELETE') return Promise.resolve({ ok: true })
      return Promise.resolve({ ok: true })
    })
    // @ts-expect-error mocking incompatible types
    global.fetch = fetchMock
    Object.defineProperty(global, 'localStorage', {
      value: { getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn(), clear: jest.fn() },
      writable: true
    })

    render(<TestHarness profile={profile} isLoggedIn />)
    const user = userEvent.setup()
    await user.click(screen.getByText('reset'))
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/profiles/p4/scripture-progress'),
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  test('lastViewedScripture comes from localStorage when no profile lastViewedScripture', async () => {
    const stored = { reference: 'Rom 8:28', sectionId: 's1', subsectionId: 'ss1', viewedAt: new Date().toISOString() }
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: jest.fn((key: string) => (key.includes('p5') ? JSON.stringify(stored) : null)),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
      },
      writable: true
    })
    const profile = { slug: 'p5', isDefault: false }
    render(<TestHarness profile={profile} isLoggedIn={false} />)
    expect(screen.getByTestId('last')).toHaveTextContent('Rom 8:28')
  })
})
