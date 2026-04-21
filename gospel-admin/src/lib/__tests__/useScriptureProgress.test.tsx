import React from 'react'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
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

  test('after reset, lastViewedScripture is none even if profile prop still has stale lastViewedScripture (no rerender)', async () => {
    const profile = {
      slug: 'p-stale-rsc',
      isDefault: false,
      lastViewedScripture: {
        reference: 'Ephesians 4:25-32',
        sectionId: 'section-1',
        subsectionId: 'section-1-0',
        viewedAt: new Date('2024-01-01'),
      },
    }
    const fetchMock = jest.fn((url: string, opts?: any) => {
      if (opts?.method === 'DELETE') return Promise.resolve({ ok: true })
      return Promise.resolve({ ok: true })
    })
    // @ts-expect-error mocking incompatible types
    global.fetch = fetchMock
    Object.defineProperty(global, 'localStorage', {
      value: { getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn(), clear: jest.fn() },
      writable: true,
    })

    render(<TestHarness profile={profile} isLoggedIn />)
    expect(screen.getByTestId('last')).toHaveTextContent('Ephesians 4:25-32')

    const user = userEvent.setup()
    await user.click(screen.getByText('reset'))
    await waitFor(() => {
      expect(screen.getByTestId('last')).toHaveTextContent('none')
    })
  })

  test('tracking after reset does not revert to stale profile.lastViewedScripture before RSC refresh', async () => {
    const staleProfile = {
      slug: 'p-stale-after-reset',
      isDefault: false,
      lastViewedScripture: {
        reference: 'Genesis 1:1',
        sectionId: 'section-1',
        subsectionId: 'section-1-0',
        viewedAt: new Date('2020-01-01'),
      },
    }
    const fetchMock = jest.fn((url: string, opts?: any) => {
      if (opts?.method === 'DELETE') return Promise.resolve({ ok: true })
      return Promise.resolve({ ok: true })
    })
    // @ts-expect-error mocking incompatible types
    global.fetch = fetchMock
    const store: Record<string, string> = {}
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: jest.fn((k: string) => store[k] ?? null),
        setItem: jest.fn((k: string, v: string) => {
          store[k] = v
        }),
        removeItem: jest.fn((k: string) => {
          delete store[k]
        }),
        clear: jest.fn(() => {
          for (const k of Object.keys(store)) delete store[k]
        }),
      },
      writable: true,
    })

    function Harness({ profile }: { profile: typeof staleProfile }) {
      const { trackScriptureView, resetProgress, lastViewedScripture } = useScriptureProgress(profile, true)
      return (
        <div>
          <button type="button" onClick={() => resetProgress()}>
            reset
          </button>
          <button type="button" onClick={() => trackScriptureView('John 3:16', 'section-2', 'section-2-0')}>
            track
          </button>
          <div data-testid="last">{lastViewedScripture?.reference ?? 'none'}</div>
        </div>
      )
    }

    const { rerender } = render(<Harness profile={staleProfile} />)
    await waitFor(() => expect(screen.getByTestId('last')).toHaveTextContent('Genesis 1:1'))

    const user = userEvent.setup()
    await user.click(screen.getByText('reset'))
    await waitFor(() => expect(screen.getByTestId('last')).toHaveTextContent('none'))

    await user.click(screen.getByText('track'))
    await waitFor(() => expect(screen.getByTestId('last')).toHaveTextContent('John 3:16'))

    rerender(<Harness profile={staleProfile} />)
    expect(screen.getByTestId('last')).toHaveTextContent('John 3:16')
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

  test('modal-view track does not overwrite same reference with real anchors (anonymous localStorage)', async () => {
    const setItem = jest.fn()
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: jest.fn(() => null),
        setItem,
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    })
    const profile = { slug: 'pModalSkip', isDefault: false }

    function Harness() {
      const { trackScriptureView, lastViewedScripture } = useScriptureProgress(profile, false)
      return (
        <div>
          <button
            type="button"
            onClick={async () => {
              await trackScriptureView('John 3:16', 'section-1', 'section-1-0')
              await trackScriptureView('John 3:16', 'modal-view', 'modal-view')
            }}
          >
            track-same-ref-then-modal
          </button>
          <div data-testid="sub">{lastViewedScripture?.subsectionId ?? 'none'}</div>
        </div>
      )
    }

    render(<Harness />)
    await userEvent.setup().click(screen.getByText('track-same-ref-then-modal'))
    await waitFor(() => expect(screen.getByTestId('sub')).toHaveTextContent('section-1-0'))
    for (const call of setItem.mock.calls) {
      const payload = JSON.parse(call[1] as string)
      expect(payload.sectionId).not.toBe('modal-view')
      expect(payload.subsectionId).not.toBe('modal-view')
    }
  })

  test('modal-view track for a new reference updates stored verse (anonymous localStorage)', async () => {
    const setItem = jest.fn()
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: jest.fn(() => null),
        setItem,
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    })
    const profile = { slug: 'pModalNewRef', isDefault: false }

    function Harness() {
      const { trackScriptureView, lastViewedScripture } = useScriptureProgress(profile, false)
      return (
        <div>
          <button
            type="button"
            onClick={async () => {
              await trackScriptureView('Rom 1:1', 'section-1', 'section-1-0')
              await trackScriptureView('Rom 8:28', 'modal-view', 'modal-view')
            }}
          >
            track-then-new-modal-ref
          </button>
          <div data-testid="ref">{lastViewedScripture?.reference ?? 'none'}</div>
        </div>
      )
    }

    render(<Harness />)
    await userEvent.setup().click(screen.getByText('track-then-new-modal-ref'))
    await waitFor(() => expect(screen.getByTestId('ref')).toHaveTextContent('Rom 8:28'))
    const lastPayload = JSON.parse(setItem.mock.calls[setItem.mock.calls.length - 1][1] as string)
    expect(lastPayload.reference).toBe('Rom 8:28')
    expect(lastPayload.sectionId).toBe('modal-view')
    expect(lastPayload.subsectionId).toBe('modal-view')
  })
})
