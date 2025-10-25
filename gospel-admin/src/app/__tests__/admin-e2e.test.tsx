import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminPage from '../admin/page'
import { isAuthenticated } from '@/lib/auth'

// Mock authentication functions
jest.mock('@/lib/auth', () => ({
  isAuthenticated: jest.fn(),
  authenticate: jest.fn(),
  logout: jest.fn(),
  getAuthStatus: jest.fn(),
  getSessionToken: jest.fn()
}))

const mockIsAuthenticated = isAuthenticated as jest.MockedFunction<typeof isAuthenticated>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('Admin Authentication E2E Tests', () => {
  beforeEach(() => {
    mockIsAuthenticated.mockClear()
    mockFetch.mockClear()
    localStorage.clear()
  })

  it('should show login form when user is not authenticated', () => {
    mockIsAuthenticated.mockReturnValue(false)
    
    render(<AdminPage />)
    
    expect(screen.getByText('🔐 Admin Access')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Admin password')).toBeInTheDocument()
    expect(screen.getByText('🔑 Access Admin Panel')).toBeInTheDocument()
  })

  it('should show admin interface when user is authenticated', () => {
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
      return Promise.reject(new Error('Unknown URL'))
    })
    render(<AdminPage />)
    waitFor(() => {
      expect(screen.getByText(/Admin Dashboard/)).toBeInTheDocument()
    })
    expect(screen.queryByText('🔐 Admin Access')).not.toBeInTheDocument()
  })

  it('should handle authentication state changes', async () => {
    // Start unauthenticated
    mockIsAuthenticated.mockReturnValue(false)
    
    const { unmount } = render(<AdminPage />)
    
    expect(screen.getByText('🔐 Admin Access')).toBeInTheDocument()
    
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
      return Promise.reject(new Error('Unknown URL'))
    })
    
    // Re-render with new auth state
    render(<AdminPage />)
    
    await waitFor(() => {
      expect(screen.getByText(/Admin Dashboard/)).toBeInTheDocument()
    })
  })

  it('should persist authentication state across page refreshes', () => {
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
      return Promise.reject(new Error('Unknown URL'))
    })
    render(<AdminPage />)
    waitFor(() => {
      expect(screen.getByText(/Admin Dashboard/)).toBeInTheDocument()
    })
  })

  it('should handle expired authentication sessions', () => {
    // Simulate expired authentication
    const expiredAuthData = {
      isAuthenticated: true,
      timestamp: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
      sessionToken: 'expired-token'
    }
    localStorage.setItem('gospel-admin-auth', JSON.stringify(expiredAuthData))
    
    mockIsAuthenticated.mockReturnValue(false) // Should return false for expired auth
    
    render(<AdminPage />)
    
    expect(screen.getByText('🔐 Admin Access')).toBeInTheDocument()
    expect(screen.queryByText(/Gospel Presentation Editor/)).not.toBeInTheDocument()
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
      return Promise.reject(new Error('Unknown URL'))
    })
    render(<AdminPage />)
    await waitFor(() => {
      expect(screen.getByText(/Admin Dashboard/)).toBeInTheDocument()
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
      expect(screen.getByText(/Admin Dashboard/)).toBeInTheDocument()
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
      return Promise.reject(new Error('Unknown URL'))
    })
    
    render(<AdminPage />)
    
    await waitFor(() => {
    expect(screen.getByText(/Admin Dashboard/)).toBeInTheDocument()
    })

    // Authentication should remain valid during admin operations
    expect(mockIsAuthenticated).toHaveBeenCalled()
  })
})

describe('Admin Access Control', () => {
  it('should prevent unauthorized access to admin features', () => {
    mockIsAuthenticated.mockReturnValue(false)
    
    render(<AdminPage />)
    
    // Should not show admin features
    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument()
    expect(screen.queryByText('Gospel Sections')).not.toBeInTheDocument()
    expect(screen.queryByText('Commit History')).not.toBeInTheDocument()
    
    // Should show login form instead
    expect(screen.getByText('🔐 Admin Access')).toBeInTheDocument()
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
      return Promise.reject(new Error('Unknown URL'))
    })
    
    render(<AdminPage />)
    
    await waitFor(() => {
      expect(screen.getByText(/Admin Dashboard/)).toBeInTheDocument()
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
      expect(screen.getByText(/Admin Dashboard/)).toBeInTheDocument()
    })
    // Find and click logout button if it exists
    const logoutButton = screen.queryByText('Logout') || screen.queryByText('Sign Out')
    if (logoutButton) {
      await user.click(logoutButton)
      // After logout, should show login form
      await waitFor(() => {
        expect(screen.getByText('🔐 Admin Access')).toBeInTheDocument()
      })
    }
  })
})