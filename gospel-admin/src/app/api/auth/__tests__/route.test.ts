import { POST, validateSession } from '../route'
import { NextRequest } from 'next/server'

describe('/api/auth', () => {
  const originalEnv = process.env.ADMIN_PASSWORD

  beforeEach(() => {
    // Set test password
    process.env.ADMIN_PASSWORD = 'test-admin-password'
  })

  afterEach(() => {
    // Restore original environment
    if (originalEnv) {
      process.env.ADMIN_PASSWORD = originalEnv
    } else {
      delete process.env.ADMIN_PASSWORD
    }
  })

  describe('POST /api/auth', () => {
    it('should authenticate with correct password', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth', {
        method: 'POST',
        body: JSON.stringify({ password: 'test-admin-password' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.sessionToken).toBeDefined()
      expect(typeof data.sessionToken).toBe('string')
      expect(data.sessionToken.length).toBe(64) // 32 bytes in hex = 64 chars
    })

    it('should reject incorrect password', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth', {
        method: 'POST',
        body: JSON.stringify({ password: 'wrong-password' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid password')
      expect(data.sessionToken).toBeUndefined()
    })

    it('should require password field', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth', {
        method: 'POST',
        body: JSON.stringify({})
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Password required')
    })

    it('should reject empty password', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth', {
        method: 'POST',
        body: JSON.stringify({ password: '' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Password required')
    })

    it('should handle missing ADMIN_PASSWORD environment variable', async () => {
      delete process.env.ADMIN_PASSWORD

      const request = new NextRequest('http://localhost:3000/api/auth', {
        method: 'POST',
        body: JSON.stringify({ password: 'any-password' })
      })

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Server configuration error')
      expect(consoleSpy).toHaveBeenCalledWith('ADMIN_PASSWORD environment variable not set')
      
      consoleSpy.mockRestore()
    })

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth', {
        method: 'POST',
        body: 'invalid-json'
      })

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Server error')
      expect(consoleSpy).toHaveBeenCalledWith('Auth API error:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    it('should generate unique session tokens', async () => {
      const request1 = new NextRequest('http://localhost:3000/api/auth', {
        method: 'POST',
        body: JSON.stringify({ password: 'test-admin-password' })
      })

      const request2 = new NextRequest('http://localhost:3000/api/auth', {
        method: 'POST',
        body: JSON.stringify({ password: 'test-admin-password' })
      })

      const response1 = await POST(request1)
      const response2 = await POST(request2)
      
      const data1 = await response1.json()
      const data2 = await response2.json()

      expect(data1.sessionToken).not.toBe(data2.sessionToken)
    })
  })

  describe('validateSession', () => {
    it('should validate valid session token', async () => {
      // First authenticate to get a token
      const request = new NextRequest('http://localhost:3000/api/auth', {
        method: 'POST',
        body: JSON.stringify({ password: 'test-admin-password' })
      })

      const response = await POST(request)
      const data = await response.json()
      const token = data.sessionToken

      // Validate the token
      expect(validateSession(token)).toBe(true)
    })

    it('should reject invalid session token', () => {
      expect(validateSession('invalid-token')).toBe(false)
      expect(validateSession('')).toBe(false)
    })

    it('should reject expired session tokens', async () => {
      // Mock Date.now to simulate time passing
      const originalNow = Date.now
      const mockNow = jest.fn()
      Date.now = mockNow

      // Set initial time
      mockNow.mockReturnValue(1000000)

      // Create session
      const request = new NextRequest('http://localhost:3000/api/auth', {
        method: 'POST',
        body: JSON.stringify({ password: 'test-admin-password' })
      })

      const response = await POST(request)
      const data = await response.json()
      const token = data.sessionToken

      // Token should be valid initially
      expect(validateSession(token)).toBe(true)

      // Simulate 25 hours later
      mockNow.mockReturnValue(1000000 + (25 * 60 * 60 * 1000))

      // Token should now be expired
      expect(validateSession(token)).toBe(false)

      // Restore original Date.now
      Date.now = originalNow
    })

    it('should clean expired sessions automatically', async () => {
      const originalNow = Date.now
      const mockNow = jest.fn()
      Date.now = mockNow

      mockNow.mockReturnValue(1000000)

      // Create session
      const request = new NextRequest('http://localhost:3000/api/auth', {
        method: 'POST',
        body: JSON.stringify({ password: 'test-admin-password' })
      })

      const response = await POST(request)
      const data = await response.json()
      const token = data.sessionToken

      // Simulate 25 hours later
      mockNow.mockReturnValue(1000000 + (25 * 60 * 60 * 1000))

      // Validate should trigger cleanup and return false
      expect(validateSession(token)).toBe(false)

      // Another validation should still return false (session was cleaned)
      expect(validateSession(token)).toBe(false)

      Date.now = originalNow
    })
  })
})