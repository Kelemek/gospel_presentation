import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// Simple in-memory session store (in production, use Redis or database)
const sessions = new Map<string, { timestamp: number }>()

// Clean expired sessions
function cleanExpiredSessions() {
  const now = Date.now()
  const twentyFourHours = 24 * 60 * 60 * 1000
  
  for (const [token, session] of sessions.entries()) {
    if (now - session.timestamp > twentyFourHours) {
      sessions.delete(token)
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    
    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 })
    }
    
    // Check password against environment variable
    const adminPassword = process.env.ADMIN_PASSWORD
    
    if (!adminPassword) {
      console.error('ADMIN_PASSWORD environment variable not set')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    
    if (password === adminPassword) {
      // Clean expired sessions
      cleanExpiredSessions()
      
      // Generate session token
      const sessionToken = crypto.randomBytes(32).toString('hex')
      sessions.set(sessionToken, { timestamp: Date.now() })
      
      return NextResponse.json({ 
        success: true, 
        sessionToken: sessionToken 
      }, { status: 200 })
    } else {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }
  } catch (error) {
    console.error('Auth API error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// Validate session token
export function validateSession(token: string): boolean {
  cleanExpiredSessions()
  return sessions.has(token)
}

// Export for use by other API routes
export { validateSession as isValidSession }