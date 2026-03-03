import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useProfileWithCache } from '../useProfileWithCache'

function TestHarness({ slug }: { slug: string }) {
  const { profile, isLoading, error, refresh } = useProfileWithCache(slug)

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'idle'}</div>
      <div data-testid="error">{error || ''}</div>
      <div data-testid="profile">{profile ? profile.title : 'none'}</div>
      <button onClick={() => refresh()}>refresh</button>
    </div>
  )
}

describe('useProfileWithCache', () => {
  const originalFetch = global.fetch
  const originalLocalStorage = global.localStorage

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global as any).localStorage = {
      getItem: jest.fn(() => null),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    }
  })

  afterEach(() => {
    ;(global as any).fetch = originalFetch
    ;(global as any).localStorage = originalLocalStorage
  })

  it('fetches profile when no cache and sets loading state', async () => {
    const mockProfile = {
      id: 'p1',
      slug: 'test',
      title: 'Test Profile',
      gospelData: [],
      isDefault: false,
      isTemplate: false,
      visitCount: 0,
      updatedAt: new Date().toISOString()
    }
    ;(global as any).fetch = jest.fn((url: string) => {
      if (url.includes('/api/profiles/test')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ profile: mockProfile })
        })
      }
      if (url.includes('/modified')) {
        return Promise.resolve({ ok: true, json: async () => ({ updatedAt: mockProfile.updatedAt }) })
      }
      return Promise.resolve({ ok: false })
    })

    render(<TestHarness slug="test" />)

    expect(screen.getByTestId('loading')).toHaveTextContent('loading')
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('idle'))
    await waitFor(() => expect(screen.getByTestId('profile')).toHaveTextContent('Test Profile'))
  })

  it('uses cached profile when available and skips fetch initially', async () => {
    const cached = {
      profile: {
        id: 'p1',
        slug: 'cached',
        title: 'Cached Profile',
        gospelData: [],
        isDefault: false,
        isTemplate: false,
        visitCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    }
    ;(global as any).localStorage.getItem = jest.fn((key: string) =>
      key === 'gospel-profile-cached' ? JSON.stringify(cached) : null
    )

    let fetchCount = 0
    ;(global as any).fetch = jest.fn((url: string) => {
      fetchCount++
      if (url.includes('/modified')) {
        return Promise.resolve({ ok: true, json: async () => ({ updatedAt: cached.updatedAt }) })
      }
      return Promise.resolve({ ok: true, json: async () => ({ profile: cached.profile }) })
    })

    render(<TestHarness slug="cached" />)

    await waitFor(() => expect(screen.getByTestId('profile')).toHaveTextContent('Cached Profile'))
    expect(screen.getByTestId('loading')).toHaveTextContent('idle')
  })

  it('sets error when fetch fails', async () => {
    ;(global as any).fetch = jest.fn(() => Promise.reject(new Error('Network error')))

    render(<TestHarness slug="fail" />)

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('idle'))
    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent(/Failed to load profile/))
  })

  it('refresh calls fetch again', async () => {
    const mockProfile = {
      id: 'p1',
      slug: 'r',
      title: 'Refreshed',
      gospelData: [],
      isDefault: false,
      isTemplate: false,
      visitCount: 0,
      updatedAt: new Date().toISOString()
    }
    ;(global as any).fetch = jest.fn((url: string) => {
      if (url.includes('/api/profiles/r') && !url.includes('/modified')) {
        return Promise.resolve({ ok: true, json: async () => ({ profile: mockProfile }) })
      }
      if (url.includes('/modified')) {
        return Promise.resolve({ ok: true, json: async () => ({ updatedAt: mockProfile.updatedAt }) })
      }
      return Promise.resolve({ ok: false })
    })

    render(<TestHarness slug="r" />)

    await waitFor(() => expect(screen.getByTestId('profile')).toHaveTextContent('Refreshed'))
    const initialFetchCount = (global.fetch as jest.Mock).mock.calls.length

    await userEvent.click(screen.getByText('refresh'))
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('idle'))

    expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(initialFetchCount)
  })

  it('sets profile null when fetch returns 404', async () => {
    ;(global as any).fetch = jest.fn((url: string) => {
      if (url.includes('/api/profiles/notfound')) {
        return Promise.resolve({ ok: false, status: 404 })
      }
      return Promise.resolve({ ok: false })
    })

    render(<TestHarness slug="notfound" />)

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('idle'))
    expect(screen.getByTestId('profile')).toHaveTextContent('none')
  })
})
