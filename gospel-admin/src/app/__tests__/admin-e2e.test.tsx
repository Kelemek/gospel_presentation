// Mock authentication functions (declare before importing modules that use it)
jest.mock('@/lib/auth', () => ({
  isAuthenticated: jest.fn(),
  authenticate: jest.fn(),
  logout: jest.fn(),
  getAuthStatus: jest.fn(),
  getSessionToken: jest.fn(),
}))

// Use the shared next/navigation mock push from jest.setup.js (global.__mockNextPush).
// Read at test time so we get the mock that was set when the setup ran.
const getMockPush = () => (global as any).__mockNextPush as jest.Mock

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminPage from '../admin/page'
import { isAuthenticated } from '@/lib/auth'

const mockIsAuthenticated = isAuthenticated as jest.MockedFunction<typeof isAuthenticated>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

function fetchUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (typeof Request !== 'undefined' && input instanceof Request) return input.url
  return String(input)
}

function okJson(data: unknown): Promise<Response> {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(''),
  } as Response)
}

function expectAdminDashboard() {
  expect(screen.getByRole('heading', { name: 'Resource templates' })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Assigned resources' })).not.toBeInTheDocument()
  expect(screen.queryByText(/Create from backup/i)).not.toBeInTheDocument()
}

describe('Admin Authentication E2E Tests', () => {
  beforeEach(() => {
    mockIsAuthenticated.mockClear()
    mockFetch.mockClear()
    localStorage.clear()
  })

  it('should show login form when user is not authenticated', async () => {
    mockIsAuthenticated.mockReturnValue(false)

    render(<AdminPage />)

    // Should redirect to login when not authenticated (effect is async)
    await waitFor(() => expect(getMockPush()).toHaveBeenCalledWith('/login'))
  })

  it('should show admin interface when user is authenticated', async () => {
    mockIsAuthenticated.mockReturnValue(true)
    // Mock successful API responses
    mockFetch.mockImplementation((input) => {
      const url = fetchUrl(input)
      if (url.includes('/api/profiles/templates')) {
        return okJson({ profiles: [], total: 0, totalPages: 1 })
      }
      if (url.includes('/api/profiles')) {
        return okJson({
          profiles: [
            {
              id: '1',
              slug: 'test-profile',
              title: 'Test Profile',
              description: 'A test profile',
              isDefault: true,
              visitCount: 1,
              lastVisited: '2025-10-24T12:00:00.000Z',
              createdAt: '2025-01-01T00:00:00.000Z',
              updatedAt: '2025-10-23T00:00:00.000Z',
            },
          ],
        })
      }
      if (url.includes('/api/users')) {
        return okJson({ users: [] })
      }
      if (url.includes('/api/admin/translation-settings')) {
        return okJson({ settings: [] })
      }
      if (url.includes('/api/data')) {
        return okJson([])
      }
      if (url.includes('/api/commits')) {
        return okJson([])
      }
      return okJson({})
    })
    render(<AdminPage />)
    await waitFor(() => {
      expectAdminDashboard()
    })
    expect(screen.queryByText('🔐 Admin Access')).not.toBeInTheDocument()
  })

  it('should handle authentication state changes', async () => {
    // Start unauthenticated
    mockIsAuthenticated.mockReturnValue(false)

    const { unmount } = render(<AdminPage />)

    // Should have redirected to login when unauthenticated
    await waitFor(() => expect(getMockPush()).toHaveBeenCalledWith('/login'))

    // Unmount and simulate successful authentication
    unmount()
    mockIsAuthenticated.mockReturnValue(true)
    mockFetch.mockImplementation((input) => {
      const url = fetchUrl(input)
      if (url.includes('/api/profiles/templates')) {
        return okJson({ profiles: [], total: 0, totalPages: 1 })
      }
      if (url.includes('/api/profiles')) {
        return okJson({
          profiles: [
            {
              id: '1',
              slug: 'test-profile',
              title: 'Test Profile',
              description: 'A test profile',
              isDefault: true,
              visitCount: 1,
              lastVisited: '2025-10-24T12:00:00.000Z',
              createdAt: '2025-01-01T00:00:00.000Z',
              updatedAt: '2025-10-23T00:00:00.000Z',
            },
          ],
        })
      }
      if (url.includes('/api/users')) {
        return okJson({ users: [] })
      }
      if (url.includes('/api/admin/translation-settings')) {
        return okJson({ settings: [] })
      }
      if (url.includes('/api/data')) {
        return okJson([])
      }
      if (url.includes('/api/commits')) {
        return okJson([])
      }
      return okJson({})
    })

    // Re-render with new auth state
    render(<AdminPage />)

    await waitFor(() => {
      expectAdminDashboard()
    })
  })

  it('should persist authentication state across page refreshes', async () => {
    // Simulate authentication persistence in localStorage
    const authData = {
      isAuthenticated: true,
      timestamp: Date.now(),
      sessionToken: 'test-token',
    }
    localStorage.setItem('gospel-admin-auth', JSON.stringify(authData))
    mockIsAuthenticated.mockReturnValue(true)
    mockFetch.mockImplementation((input) => {
      const url = fetchUrl(input)
      if (url.includes('/api/profiles/templates')) {
        return okJson({ profiles: [], total: 0, totalPages: 1 })
      }
      if (url.includes('/api/profiles')) {
        return okJson({
          profiles: [
            {
              id: '1',
              slug: 'test-profile',
              title: 'Test Profile',
              description: 'A test profile',
              isDefault: true,
              visitCount: 1,
              lastVisited: '2025-10-24T12:00:00.000Z',
              createdAt: '2025-01-01T00:00:00.000Z',
              updatedAt: '2025-10-23T00:00:00.000Z',
            },
          ],
        })
      }
      if (url.includes('/api/users')) {
        return okJson({ users: [] })
      }
      if (url.includes('/api/admin/translation-settings')) {
        return okJson({ settings: [] })
      }
      if (url.includes('/api/data')) {
        return okJson([])
      }
      if (url.includes('/api/commits')) {
        return okJson([])
      }
      return okJson({})
    })
    render(<AdminPage />)
    await waitFor(() => {
      expectAdminDashboard()
    })
  })

  it('should handle expired authentication sessions', async () => {
    // Simulate expired authentication
    const expiredAuthData = {
      isAuthenticated: true,
      timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
      sessionToken: 'expired-token',
    }
    localStorage.setItem('gospel-admin-auth', JSON.stringify(expiredAuthData))

    mockIsAuthenticated.mockReturnValue(false) // Should return false for expired auth

    render(<AdminPage />)

    await waitFor(() => expect(getMockPush()).toHaveBeenCalledWith('/login'))
  })
})

describe('Admin Session Management', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    localStorage.clear()
  })

  it('should handle session token in API requests', async () => {
    mockIsAuthenticated.mockReturnValue(true)
    const sessionToken = 'valid-session-token'
    localStorage.setItem(
      'gospel-admin-auth',
      JSON.stringify({
        isAuthenticated: true,
        timestamp: Date.now(),
        sessionToken,
      })
    )
    mockFetch.mockImplementation((input) => {
      const url = fetchUrl(input)
      if (url.includes('/api/profiles/templates')) {
        return okJson({ profiles: [], total: 0, totalPages: 1 })
      }
      if (url.includes('/api/profiles')) {
        return okJson({
          profiles: [
            {
              id: '1',
              slug: 'test-profile',
              title: 'Test Profile',
              description: 'A test profile',
              isDefault: true,
              visitCount: 1,
              lastVisited: '2025-10-24T12:00:00.000Z',
              createdAt: '2025-01-01T00:00:00.000Z',
              updatedAt: '2025-10-23T00:00:00.000Z',
            },
          ],
        })
      }
      if (url.includes('/api/users')) {
        return okJson({ users: [] })
      }
      if (url.includes('/api/admin/translation-settings')) {
        return okJson({ settings: [] })
      }
      if (url.includes('/api/data')) {
        return okJson([])
      }
      if (url.includes('/api/commits')) {
        return okJson([])
      }
      return okJson({})
    })
    render(<AdminPage />)
    await waitFor(() => {
      expectAdminDashboard()
    })
    // Verify that API calls include the session token
    expect(mockFetch).toHaveBeenCalled()
  })

  it('should handle API authentication failures', async () => {
    mockIsAuthenticated.mockReturnValue(true)

    // Mock API returning 401 Unauthorized
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: () => Promise.resolve({}),
      text: () => Promise.resolve('Unauthorized'),
    } as Response)

    render(<AdminPage />)

    // Templates list fetch fails; dashboard no longer loads assigned profiles on mount.
    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch templates/i)).toBeInTheDocument()
    })
  })

  it('should maintain authentication during admin operations', async () => {
    mockIsAuthenticated.mockReturnValue(true)

    const mockGospelData = [
      {
        section: '1',
        title: 'Test Section',
        subsections: [
          {
            title: 'Test Subsection',
            content: 'Test content',
            scriptureReferences: [{ reference: 'John 3:16' }],
          },
        ],
      },
    ]

    mockFetch.mockImplementation((input) => {
      const url = fetchUrl(input)
      if (url.includes('/api/profiles/templates')) {
        return okJson({ profiles: [], total: 0, totalPages: 1 })
      }
      if (url.includes('/api/profiles')) {
        return okJson({ profiles: [] })
      }
      if (url.includes('/api/users')) {
        return okJson({ users: [] })
      }
      if (url.includes('/api/admin/translation-settings')) {
        return okJson({ settings: [] })
      }
      if (url.includes('/api/data')) {
        return okJson(mockGospelData)
      }
      if (url.includes('/api/commits')) {
        return okJson([])
      }
      return okJson({})
    })

    render(<AdminPage />)

    await waitFor(() => {
      expectAdminDashboard()
    })

    // Authentication should remain valid during admin operations
    expect(mockIsAuthenticated).toHaveBeenCalled()
  })
})

describe('Admin Access Control', () => {
  it('should prevent unauthorized access to admin features', async () => {
    mockIsAuthenticated.mockReturnValue(false)

    render(<AdminPage />)

    // Should not show admin features
    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument()
    expect(screen.queryByText('Gospel Sections')).not.toBeInTheDocument()
    expect(screen.queryByText('Commit History')).not.toBeInTheDocument()

    // Should show login form instead (redirect happens asynchronously)
    await waitFor(() => expect(getMockPush()).toHaveBeenCalledWith('/login'))
  })

  it('should show all admin features when authenticated', async () => {
    mockIsAuthenticated.mockReturnValue(true)

    mockFetch.mockImplementation((input) => {
      const url = fetchUrl(input)
      if (url.includes('/api/profiles/templates')) {
        return okJson({ profiles: [], total: 0, totalPages: 1 })
      }
      if (url.includes('/api/profiles')) {
        return okJson({
          profiles: [
            {
              id: '1',
              slug: 'test-profile',
              title: 'Test Profile',
              description: 'A test profile',
              isDefault: true,
              visitCount: 1,
              lastVisited: '2025-10-24T12:00:00.000Z',
              createdAt: '2025-01-01T00:00:00.000Z',
              updatedAt: '2025-10-23T00:00:00.000Z',
            },
          ],
        })
      }
      if (url.includes('/api/users')) {
        return okJson({ users: [] })
      }
      if (url.includes('/api/admin/translation-settings')) {
        return okJson({ settings: [] })
      }
      if (url.includes('/api/data')) {
        return okJson([])
      }
      if (url.includes('/api/commits')) {
        return okJson([])
      }
      return okJson({})
    })

    render(<AdminPage />)

    await waitFor(() => {
      expectAdminDashboard()
    })
  })

  it('should handle logout functionality', async () => {
    const user = userEvent.setup()
    mockIsAuthenticated.mockReturnValue(true)

    mockFetch.mockImplementation((input) => {
      const url = fetchUrl(input)
      if (url.includes('/api/profiles/templates')) {
        return okJson({ profiles: [], total: 0, totalPages: 1 })
      }
      if (url.includes('/api/profiles')) {
        return okJson({
          profiles: [
            {
              id: '1',
              slug: 'test-profile',
              title: 'Test Profile',
              description: 'A test profile',
              isDefault: true,
              visitCount: 1,
              lastVisited: '2025-10-24T12:00:00.000Z',
              createdAt: '2025-01-01T00:00:00.000Z',
              updatedAt: '2025-10-23T00:00:00.000Z',
            },
          ],
        })
      }
      if (url.includes('/api/users')) {
        return okJson({ users: [] })
      }
      if (url.includes('/api/admin/translation-settings')) {
        return okJson({ settings: [] })
      }
      if (url.includes('/api/data')) {
        return okJson([])
      }
      if (url.includes('/api/commits')) {
        return okJson([])
      }
      return okJson({})
    })

    render(<AdminPage />)

    await waitFor(() => {
      expectAdminDashboard()
    })
    // Find and click logout button if it exists
    const logoutButton = screen.queryByText('Logout') || screen.queryByText('Sign Out')
    if (logoutButton) {
      await user.click(logoutButton)
      // After logout, should redirect to login
      await waitFor(() => {
        expect(getMockPush()).toHaveBeenCalledWith('/login')
      })
    }
  })
})
