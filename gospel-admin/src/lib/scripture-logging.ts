/**
 * Scripture Access Logging Utility
 * Logs all scripture requests by session for tracking translation usage
 * Uses unique session IDs for tracking (both authenticated and anonymous users)
 */

import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import type { BibleTranslation } from '@/lib/bible-translations'

export type { BibleTranslation }

interface ScriptureAccessLogData {
  reference: string
  translation: BibleTranslation
  sessionId: string
  request: NextRequest
}

/**
 * Log scripture access for usage tracking
 * Called whenever scripture is fetched (any translation)
 */
export async function logScriptureAccess(data: ScriptureAccessLogData): Promise<void> {
  try {
    const supabase = createAdminClient()

    const { error } = await (supabase.from('scripture_access_logs') as any).insert({
      scripture_reference: data.reference,
      translation: data.translation,
      session_id: data.sessionId
    })
    
    if (error) {
      logger.warn(`Failed to log scripture access for ${data.translation} (${data.reference}):`, error)
    } else {
      logger.debug(`Logged ${data.translation} access: ${data.reference}`)
    }
  } catch (error) {
    // Never fail the scripture request due to logging errors
    logger.warn('Unexpected error logging scripture access:', error)
  }
}

/**
 * Get or create a session ID for tracking users
 * Store in request context or generate from request fingerprint
 */
export function getSessionId(request: NextRequest): string {
  // Try to get existing session ID from header
  const existingSessionId = request.headers.get('x-session-id')
  if (existingSessionId) {
    return existingSessionId
  }
  
  // Try to get from cookies
  const cookieSessionId = request.cookies.get('scripture_session_id')?.value
  if (cookieSessionId) {
    return cookieSessionId
  }
  
  // Generate new session ID from request fingerprint
  // In a real app, you'd want to send this back via Set-Cookie header
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const fingerprint = `${userAgent}_${Date.now()}`
  const sessionId = Buffer.from(fingerprint).toString('base64').substring(0, 32)
  
  return sessionId
}

