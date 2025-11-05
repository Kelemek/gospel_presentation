// Server-side authentication utilities
import { NextRequest } from 'next/server'

// Lightweight auth shim for server-side code
const validateSession = (token: string): boolean => {
  return false
}

export interface AuthResult {
  isValid: boolean
  error?: string
}

/**
 * Validate session token from request headers or body
 */
export function validateAuthFromRequest(request: NextRequest, body?: any): AuthResult {
  let sessionToken: string | null = null

  // Try to get token from Authorization header
  const authHeader = request.headers.get('Authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    sessionToken = authHeader.substring(7)
  }

  // Try to get token from request body
  if (!sessionToken && body && body.sessionToken) {
    sessionToken = body.sessionToken
  }

  if (!sessionToken) {
    return { isValid: false, error: 'No session token provided' }
  }

  const isValid = validateSession(sessionToken)
  
  return {
    isValid,
    error: isValid ? undefined : 'Invalid or expired session token'
  }
}

/**
 * Middleware helper for protecting API routes
 */
export function requireAuth(handler: (request: NextRequest, context?: any) => Promise<Response>) {
  return async (request: NextRequest, context?: any) => {
    try {
      const body = request.method === 'POST' ? await request.json() : null
      const auth = validateAuthFromRequest(request, body)
      
      if (!auth.isValid) {
        return new Response(JSON.stringify({ error: auth.error }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      return handler(request, context)
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Authentication error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }
}