// Simple admin authentication for gospel presentation editor
'use client'

const ADMIN_PASSWORD = 'gospel2024' // In production, this should be environment variable

export interface AuthState {
  isAuthenticated: boolean
  timestamp?: number
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
export function authenticate(password: string): boolean {
  if (password === ADMIN_PASSWORD) {
    const authData: AuthState = {
      isAuthenticated: true,
      timestamp: Date.now()
    }
    localStorage.setItem('gospel-admin-auth', JSON.stringify(authData))
    return true
  }
  return false
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