import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as gospelClientStorage from '@/lib/gospelClientStorage'
import { gospelStorageSetSync } from '@/lib/gospelClientStorage'
import { profileOfflineCacheKey } from '@/lib/gospelClientStoragePolicy'
import { installTestLocalStorage } from '@/lib/testing/testLocalStorage'
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

  beforeEach(() => {
    jest.clearAllMocks()
    installTestLocalStorage()
  })

  afterEach(() => {
    ;(global as any).fetch = originalFetch
  })

  function seedOfflineCache(slug: string, payload: unknown) {
    const value = typeof payload === 'string' ? payload : JSON.stringify(payload)
    gospelStorageSetSync(profileOfflineCacheKey(slug), value)
  }

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
    seedOfflineCache('cached', cached)

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

  it('skips fetch when slug is empty and sets loading false', async () => {
    ;(global as any).fetch = jest.fn()
    render(<TestHarness slug="" />)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('idle'))
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('sets error when fetch returns non-404 error status', async () => {
    ;(global as any).fetch = jest.fn((url: string) => {
      if (url.includes('/api/profiles/err')) {
        return Promise.resolve({ ok: false, status: 500 })
      }
      return Promise.resolve({ ok: false })
    })
    render(<TestHarness slug="err" />)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('idle'))
    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent(/Failed to load profile/))
  })

  it('sets profile null when response has no profile', async () => {
    ;(global as any).fetch = jest.fn((url: string) => {
      if (url.includes('/api/profiles/empty') && !url.includes('/modified')) {
        return Promise.resolve({ ok: true, json: async () => ({}) })
      }
      if (url.includes('/modified')) {
        return Promise.resolve({ ok: true, json: async () => ({}) })
      }
      return Promise.resolve({ ok: false })
    })
    render(<TestHarness slug="empty" />)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('idle'))
    expect(screen.getByTestId('profile')).toHaveTextContent('none')
  })

  it('refetches when cached profile is stale (modified endpoint returns newer updatedAt)', async () => {
    const cached = {
      profile: {
        id: 'p1',
        slug: 'stale',
        title: 'Cached',
        gospelData: [],
        isDefault: false,
        isTemplate: false,
        visitCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: '2020-01-01T00:00:00Z'
      },
      updatedAt: '2020-01-01T00:00:00Z'
    }
    const freshProfile = {
      id: 'p1',
      slug: 'stale',
      title: 'Fresh From Server',
      gospelData: [],
      isDefault: false,
      isTemplate: false,
      visitCount: 0,
      updatedAt: '2021-01-01T00:00:00Z'
    }
    seedOfflineCache('stale', cached)
    let profileFetchCount = 0
    ;(global as any).fetch = jest.fn((url: string) => {
      if (url.includes('/modified')) {
        return Promise.resolve({ ok: true, json: async () => ({ updatedAt: '2021-01-01T00:00:00Z' }) })
      }
      if (url.includes('/api/profiles/stale') && !url.includes('/modified')) {
        profileFetchCount++
        return Promise.resolve({ ok: true, json: async () => ({ profile: freshProfile }) })
      }
      return Promise.resolve({ ok: false })
    })
    render(<TestHarness slug="stale" />)
    await waitFor(() => expect(screen.getByTestId('profile')).toHaveTextContent('Fresh From Server'))
    expect(profileFetchCount).toBeGreaterThanOrEqual(1)
  })

  it('keeps cache when modified check throws', async () => {
    const cached = {
      profile: {
        id: 'p1',
        slug: 'keep',
        title: 'Keep Me',
        gospelData: [],
        isDefault: false,
        isTemplate: false,
        visitCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    }
    seedOfflineCache('keep', cached)
    ;(global as any).fetch = jest.fn((url: string) => {
      if (url.includes('/modified')) return Promise.reject(new Error('Network error'))
      return Promise.resolve({ ok: true, json: async () => ({ profile: cached.profile }) })
    })
    render(<TestHarness slug="keep" />)
    await waitFor(() => expect(screen.getByTestId('profile')).toHaveTextContent('Keep Me'))
  })

  it('parses cached profile with lastViewedScripture and savedAnswers', async () => {
    const cached = {
      profile: {
        id: 'p1',
        slug: 'full',
        title: 'Full Cached',
        gospelData: [],
        isDefault: false,
        isTemplate: false,
        visitCount: 0,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        lastViewedScripture: { reference: 'John 3:16', sectionId: 's1', subsectionId: 'ss1', viewedAt: '2023-01-01T00:00:00Z' },
        savedAnswers: [{ questionId: 'q1', answer: 'A1', answeredAt: '2023-01-01T00:00:00Z' }]
      },
      updatedAt: '2023-01-01T00:00:00Z'
    }
    seedOfflineCache('full', cached)
    ;(global as any).fetch = jest.fn((url: string) => {
      if (url.includes('/modified')) return Promise.resolve({ ok: true, json: async () => ({ updatedAt: cached.updatedAt }) })
      return Promise.resolve({ ok: true, json: async () => ({ profile: cached.profile }) })
    })
    render(<TestHarness slug="full" />)
    await waitFor(() => expect(screen.getByTestId('profile')).toHaveTextContent('Full Cached'))
  })

  it('fetches when cache has no profile.slug (parseCachedProfile returns null)', async () => {
    seedOfflineCache('noslug', { profile: { id: 'x' }, updatedAt: '' })
    const mockProfile = { id: 'p1', slug: 'noslug', title: 'From API', gospelData: [], isDefault: false, isTemplate: false, visitCount: 0, updatedAt: new Date().toISOString() }
    ;(global as any).fetch = jest.fn((url: string) => {
      if (url.includes('/api/profiles/noslug') && !url.includes('/modified')) return Promise.resolve({ ok: true, json: async () => ({ profile: mockProfile }) })
      if (url.includes('/modified')) return Promise.resolve({ ok: true, json: async () => ({ updatedAt: mockProfile.updatedAt }) })
      return Promise.resolve({ ok: false })
    })
    render(<TestHarness slug="noslug" />)
    await waitFor(() => expect(screen.getByTestId('profile')).toHaveTextContent('From API'))
  })

  it('fetches when cache contains invalid JSON (parseCachedProfile returns null)', async () => {
    const mockProfile = {
      id: 'p1',
      slug: 'badjson',
      title: 'Fetched After Bad Cache',
      gospelData: [],
      isDefault: false,
      isTemplate: false,
      visitCount: 0,
      updatedAt: new Date().toISOString()
    }
    seedOfflineCache('badjson', 'not valid json')
    ;(global as any).fetch = jest.fn((url: string) => {
      if (url.includes('/api/profiles/badjson') && !url.includes('/modified')) {
        return Promise.resolve({ ok: true, json: async () => ({ profile: mockProfile }) })
      }
      if (url.includes('/modified')) {
        return Promise.resolve({ ok: true, json: async () => ({ updatedAt: mockProfile.updatedAt }) })
      }
      return Promise.resolve({ ok: false })
    })
    render(<TestHarness slug="badjson" />)
    await waitFor(() => expect(screen.getByTestId('profile')).toHaveTextContent('Fetched After Bad Cache'))
  })

  it('still sets profile when offline cache write fails (quota)', async () => {
    const mockProfile = {
      id: 'p1',
      slug: 'quota',
      title: 'Quota Profile',
      gospelData: [],
      isDefault: false,
      isTemplate: false,
      visitCount: 0,
      updatedAt: new Date().toISOString()
    }
    jest.spyOn(gospelClientStorage, 'gospelStorageSet').mockResolvedValue(false)
    ;(global as any).fetch = jest.fn((url: string) => {
      if (url.includes('/api/profiles/quota') && !url.includes('/modified')) {
        return Promise.resolve({ ok: true, json: async () => ({ profile: mockProfile }) })
      }
      if (url.includes('/modified')) {
        return Promise.resolve({ ok: true, json: async () => ({ updatedAt: mockProfile.updatedAt }) })
      }
      return Promise.resolve({ ok: false })
    })
    render(<TestHarness slug="quota" />)
    await waitFor(() => expect(screen.getByTestId('profile')).toHaveTextContent('Quota Profile'))
  })
})
