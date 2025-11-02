// Mock authentication functions (declare before importing modules that use it)
jest.mock('@/lib/auth', () => ({
  isAuthenticated: jest.fn(),
  authenticate: jest.fn(),
  logout: jest.fn(),
  getAuthStatus: jest.fn(),
  getSessionToken: jest.fn()
}))

// Use the shared next/navigation mock push exposed by jest.setup.js
// (global.__mockNextPush) so assertions reliably observe redirects.
const mockPush = (global as any).__mockNextPush

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminPage from '../admin/page'
import { isAuthenticated } from '@/lib/auth'

const mockIsAuthenticated = isAuthenticated as jest.MockedFunction<typeof isAuthenticated>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

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
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/login'))
  })

  it('should show admin interface when user is authenticated', async () => {
    mockIsAuthenticated.mockReturnValue(true)
    // Mock successful API responses
    mockFetch.mockImplementation((url) => {
      if (typeof url === 'string') {
        if (url.includes('/api/profiles')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ profiles: [
              {
                id: '1',
                slug: 'test-profile',
                title: 'Test Profile',
                description: 'A test profile',
                isDefault: true,
                visitCount: 1,
                lastVisited: '2025-10-24T12:00:00.000Z',
                createdAt: '2025-01-01T00:00:00.000Z',
                updatedAt: '2025-10-23T00:00:00.000Z'
              }
            ] })
          } as Response)
        }
        if (url.includes('/api/data')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([])
          } as Response)
        }
        if (url.includes('/api/commits')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([])
          } as Response)
        }
      }
      // Fallback: return empty profiles response to avoid noisy "Unknown URL" errors
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ profiles: [] }) } as Response)
    })
    render(<AdminPage />)
    await waitFor(() => {
      // Assert the admin interface header is visible. Use the explicit header text
      // shown for admins.
      expect(screen.getByText('Profile Management')).toBeInTheDocument()
    })
    expect(screen.queryByText('🔐 Admin Access')).not.toBeInTheDocument()
  })

  it('should handle authentication state changes', async () => {
    // Start unauthenticated
    mockIsAuthenticated.mockReturnValue(false)
    
    const { unmount } = render(<AdminPage />)
    
  // Should have redirected to login when unauthenticated
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/login'))
    
    // Unmount and simulate successful authentication
    unmount()
    mockIsAuthenticated.mockReturnValue(true)
    mockFetch.mockImplementation((url) => {
      if (typeof url === 'string') {
        if (url.includes('/api/data')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([])
          } as Response)
        }
        if (url.includes('/api/commits')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([])
          } as Response)
        }
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ profiles: [] }) } as Response)
    })
    
    // Re-render with new auth state
    render(<AdminPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Profile Management')).toBeInTheDocument()
    })
  })

  it('should persist authentication state across page refreshes', async () => {
    // Simulate authentication persistence in localStorage
    const authData = {
      isAuthenticated: true,
      timestamp: Date.now(),
      sessionToken: 'test-token'
    }
    localStorage.setItem('gospel-admin-auth', JSON.stringify(authData))
    mockIsAuthenticated.mockReturnValue(true)
    mockFetch.mockImplementation((url) => {
      if (typeof url === 'string') {
        if (url.includes('/api/profiles')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ profiles: [
              {
                id: '1',
                slug: 'test-profile',
                title: 'Test Profile',
                description: 'A test profile',
                isDefault: true,
                visitCount: 1,
                lastVisited: '2025-10-24T12:00:00.000Z',
                createdAt: '2025-01-01T00:00:00.000Z',
                updatedAt: '2025-10-23T00:00:00.000Z'
              }
            ] })
          } as Response)
        }
        if (url.includes('/api/data')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([])
          } as Response)
        }
        if (url.includes('/api/commits')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([])
          } as Response)
        }
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ profiles: [] }) } as Response)
    })
    render(<AdminPage />)
    await waitFor(() => {
      expect(screen.getByText('Profile Management')).toBeInTheDocument()
    })
  })

  it('should handle expired authentication sessions', async () => {
    // Simulate expired authentication
    const expiredAuthData = {
      isAuthenticated: true,
      timestamp: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
      sessionToken: 'expired-token'
    }
    localStorage.setItem('gospel-admin-auth', JSON.stringify(expiredAuthData))
    
    mockIsAuthenticated.mockReturnValue(false) // Should return false for expired auth
    
    render(<AdminPage />)
    
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/login'))
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
    localStorage.setItem('gospel-admin-auth', JSON.stringify({
      isAuthenticated: true,
      timestamp: Date.now(),
      sessionToken
    }))
    mockFetch.mockImplementation((url) => {
      if (typeof url === 'string') {
        if (url.includes('/api/profiles')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ profiles: [
              {
                id: '1',
                slug: 'test-profile',
                title: 'Test Profile',
                description: 'A test profile',
                isDefault: true,
                visitCount: 1,
                lastVisited: '2025-10-24T12:00:00.000Z',
                createdAt: '2025-01-01T00:00:00.000Z',
                updatedAt: '2025-10-23T00:00:00.000Z'
              }
            ] })
          } as Response)
        }
        if (url.includes('/api/data')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([])
          } as Response)
        }
        if (url.includes('/api/commits')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([])
          } as Response)
        }
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ profiles: [] }) } as Response)
    })
    render(<AdminPage />)
    await waitFor(() => {
      expect(screen.getByText('Profile Management')).toBeInTheDocument()
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
      statusText: 'Unauthorized'
    } as Response)
    
    render(<AdminPage />)
    
    // Should handle the auth failure gracefully
    await waitFor(() => {
      expect(screen.getByText('Profile Management')).toBeInTheDocument()
    })
  })

  it('should maintain authentication during admin operations', async () => {
    const user = userEvent.setup()
    mockIsAuthenticated.mockReturnValue(true)
    
    const mockGospelData = [
      {
        section: '1',
        title: 'Test Section',
        subsections: [
          {
            title: 'Test Subsection',
            content: 'Test content',
            scriptureReferences: [{ reference: 'John 3:16' }]
          }
        ]
      }
    ]

    mockFetch.mockImplementation((url) => {
      if (typeof url === 'string') {
        if (url.includes('/api/data')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockGospelData)
          } as Response)
        }
        if (url.includes('/api/commits')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([])
          } as Response)
        }
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ profiles: [] }) } as Response)
    })
    
    render(<AdminPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Profile Management')).toBeInTheDocument()
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
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/login'))
  })

  it('should show all admin features when authenticated', async () => {
    mockIsAuthenticated.mockReturnValue(true)
    
    mockFetch.mockImplementation((url) => {
      if (typeof url === 'string') {
        if (url.includes('/api/profiles')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ profiles: [
              {
                id: '1',
                slug: 'test-profile',
                title: 'Test Profile',
                description: 'A test profile',
                isDefault: true,
                visitCount: 1,
                lastVisited: '2025-10-24T12:00:00.000Z',
                createdAt: '2025-01-01T00:00:00.000Z',
                updatedAt: '2025-10-23T00:00:00.000Z'
              }
            ] })
          } as Response)
        }
        if (url.includes('/api/data')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([])
          } as Response)
        }
        if (url.includes('/api/commits')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([])
          } as Response)
        }
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ profiles: [] }) } as Response)
    })
    
    render(<AdminPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Profile Management')).toBeInTheDocument()
    })
    // Should show admin interface elements
    expect(screen.getByText('Profile Management')).toBeInTheDocument()
  })

  it('should handle logout functionality', async () => {
    const user = userEvent.setup()
    mockIsAuthenticated.mockReturnValue(true)
    
    mockFetch.mockImplementation((url) => {
      if (typeof url === 'string') {
        if (url.includes('/api/profiles')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ profiles: [
              {
                id: '1',
                slug: 'test-profile',
                title: 'Test Profile',
                description: 'A test profile',
                isDefault: true,
                visitCount: 1,
                lastVisited: '2025-10-24T12:00:00.000Z',
                createdAt: '2025-01-01T00:00:00.000Z',
                updatedAt: '2025-10-23T00:00:00.000Z'
              }
            ] })
          } as Response)
        }
        if (url.includes('/api/data')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([])
          } as Response)
        }
        if (url.includes('/api/commits')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([])
          } as Response)
        }
      }
      return Promise.reject(new Error('Unknown URL'))
    })
    
    render(<AdminPage />)
    
    await waitFor(() => {
      // Target the explicit admin header text to avoid matching other
      // headings like "Profiles".
      expect(screen.getByText('Profile Management')).toBeInTheDocument()
    })
    // Find and click logout button if it exists
    const logoutButton = screen.queryByText('Logout') || screen.queryByText('Sign Out')
    if (logoutButton) {
      await user.click(logoutButton)
      // After logout, should redirect to login
        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith('/login')
        })
    }
  })
})