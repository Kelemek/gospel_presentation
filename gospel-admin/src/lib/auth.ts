// Simple admin authentication for gospel presentation editor
'use client'

export interface AuthState {
  isAuthenticated: boolean
  timestamp?: number
  sessionToken?: string
}

// Check if user is authenticated (valid for 24 hours)
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    const authData = localStorage.getItem('gospel-admin-auth')
    if (!authData) return false
    
    const parsed: AuthState = JSON.parse(authData)
    if (!parsed.isAuthenticated || !parsed.timestamp) return false
    
    // Check if auth is still valid (24 hours)
    const now = Date.now()
    const twentyFourHours = 24 * 60 * 60 * 1000
    
    if (now - parsed.timestamp > twentyFourHours) {
      logout()
      return false
    }
    
    return true
  } catch {
    return false
  }
}

// Authenticate with password
export async function authenticate(password: string): Promise<boolean> {
  try {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    })

    if (response.ok) {
      const { sessionToken } = await response.json()
      const authData: AuthState = {
        isAuthenticated: true,
        timestamp: Date.now(),
        sessionToken: sessionToken
      }
      localStorage.setItem('gospel-admin-auth', JSON.stringify(authData))
      return true
    }
    return false
  } catch (error) {
    console.error('Authentication error:', error)
    return false
  }
}

// Logout and clear authentication
export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('gospel-admin-auth')
  }
}

// Get authentication status
export function getAuthStatus(): AuthState {
  return {
    isAuthenticated: isAuthenticated()
  }
}

// Get session token for authenticated requests
export function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null
  
  try {
    const authData = localStorage.getItem('gospel-admin-auth')
    if (!authData) return null
    
    const parsed: AuthState = JSON.parse(authData)
    return parsed.sessionToken || null
  } catch {
    return null
  }
}