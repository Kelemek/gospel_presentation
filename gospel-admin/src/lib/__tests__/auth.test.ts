import { 
  isAuthenticated, 
  authenticate, 
  logout, 
  getAuthStatus, 
  getSessionToken,
  AuthState 
} from '../auth'

// Mock fetch for authentication tests
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('Auth Utility Functions', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    mockFetch.mockClear()
  })

  describe('isAuthenticated', () => {
    it('should return false when no auth data exists', () => {
      expect(isAuthenticated()).toBe(false)
    })

    it('should return false for malformed auth data', () => {
      localStorage.setItem('gospel-admin-auth', 'invalid-json')
      expect(isAuthenticated()).toBe(false)
    })

    it('should return false for auth data without required fields', () => {
      const invalidAuth = { isAuthenticated: true }
      localStorage.setItem('gospel-admin-auth', JSON.stringify(invalidAuth))
      expect(isAuthenticated()).toBe(false)
    })

    it('should return false for expired auth (older than 24 hours)', () => {
      const expiredAuth: AuthState = {
        isAuthenticated: true,
        timestamp: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
        sessionToken: 'test-token'
      }
      localStorage.setItem('gospel-admin-auth', JSON.stringify(expiredAuth))
      expect(isAuthenticated()).toBe(false)
      
      // Should also clear the expired auth
      expect(localStorage.getItem('gospel-admin-auth')).toBeNull()
    })

    it('should return true for valid, recent auth', () => {
      const validAuth: AuthState = {
        isAuthenticated: true,
        timestamp: Date.now() - (1 * 60 * 60 * 1000), // 1 hour ago
        sessionToken: 'test-token'
      }
      localStorage.setItem('gospel-admin-auth', JSON.stringify(validAuth))
      expect(isAuthenticated()).toBe(true)
    })
  })

  describe('authenticate', () => {
    it('should successfully authenticate with correct password', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ sessionToken: 'valid-session-token' })
      }
      mockFetch.mockResolvedValueOnce(mockResponse as Response)

      const result = await authenticate('correct-password')
      
      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: 'correct-password' }),
      })

      // Should store auth data in localStorage
      const storedAuth = localStorage.getItem('gospel-admin-auth')
      expect(storedAuth).toBeTruthy()
      
      const parsedAuth = JSON.parse(storedAuth!)
      expect(parsedAuth.isAuthenticated).toBe(true)
      expect(parsedAuth.sessionToken).toBe('valid-session-token')
      expect(parsedAuth.timestamp).toBeCloseTo(Date.now(), -2) // Within 100ms
    })

    it('should fail authentication with incorrect password', async () => {
      const mockResponse = {
        ok: false,
        status: 401
      }
      mockFetch.mockResolvedValueOnce(mockResponse as Response)

      const result = await authenticate('wrong-password')
      
      expect(result).toBe(false)
      expect(localStorage.getItem('gospel-admin-auth')).toBeNull()
    })

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      const result = await authenticate('any-password')
      
      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('Authentication error:', expect.any(Error))
      consoleSpy.mockRestore()
    })
  })

  describe('logout', () => {
    it('should clear authentication data', () => {
      // Set up auth data
      const authData: AuthState = {
        isAuthenticated: true,
        timestamp: Date.now(),
        sessionToken: 'test-token'
      }
      localStorage.setItem('gospel-admin-auth', JSON.stringify(authData))
      
      // Logout should clear it
      logout()
      expect(localStorage.getItem('gospel-admin-auth')).toBeNull()
    })

    it('should not throw error when no auth data exists', () => {
      expect(() => logout()).not.toThrow()
    })
  })

  describe('getAuthStatus', () => {
    it('should return authentication status', () => {
      // Test unauthenticated state
      expect(getAuthStatus()).toEqual({ isAuthenticated: false })
      
      // Test authenticated state
      const authData: AuthState = {
        isAuthenticated: true,
        timestamp: Date.now(),
        sessionToken: 'test-token'
      }
      localStorage.setItem('gospel-admin-auth', JSON.stringify(authData))
      
      expect(getAuthStatus()).toEqual({ isAuthenticated: true })
    })
  })

  describe('getSessionToken', () => {
    it('should return null when no auth data exists', () => {
      expect(getSessionToken()).toBeNull()
    })

    it('should return null for malformed auth data', () => {
      localStorage.setItem('gospel-admin-auth', 'invalid-json')
      expect(getSessionToken()).toBeNull()
    })

    it('should return session token when available', () => {
      const authData: AuthState = {
        isAuthenticated: true,
        timestamp: Date.now(),
        sessionToken: 'test-session-token'
      }
      localStorage.setItem('gospel-admin-auth', JSON.stringify(authData))
      
      expect(getSessionToken()).toBe('test-session-token')
    })

    it('should return null when session token is missing', () => {
      const authData: AuthState = {
        isAuthenticated: true,
        timestamp: Date.now()
      }
      localStorage.setItem('gospel-admin-auth', JSON.stringify(authData))
      
      expect(getSessionToken()).toBeNull()
    })
  })
})