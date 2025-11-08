/**
 * Session monitor hook for client-side session validation
 * Periodically checks if the user's session is still valid and logs them out if expired
 */

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'

interface UseSessionMonitorOptions {
  /** Check interval in milliseconds (default: 60000 = 1 minute) */
  checkInterval?: number
  /** Whether to enable the monitor (default: true) */
  enabled?: boolean
  /** Callback when session expires */
  onSessionExpired?: () => void
}

export function useSessionMonitor(options: UseSessionMonitorOptions = {}) {
  const {
    checkInterval = 60000, // Check every minute
    enabled = true,
    onSessionExpired
  } = options

  const router = useRouter()

  const checkSession = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { session }, error } = await supabase.auth.getSession()

      // No session or error getting session
      if (!session || error) {
        logger.warn('Session monitor: No valid session found')
        if (onSessionExpired) {
          onSessionExpired()
        } else {
          // Default: redirect to login
          router.push('/login')
        }
        return false
      }

      // Check if session is expired
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0
      const now = Date.now()

      if (expiresAt && expiresAt < now) {
        logger.warn('Session monitor: Session expired, attempting refresh')
        
        // Try to refresh the session
        const { data: { session: refreshedSession }, error: refreshError } = 
          await supabase.auth.refreshSession()

        if (!refreshedSession || refreshError) {
          logger.warn('Session monitor: Refresh failed, logging out')
          await supabase.auth.signOut()
          
          if (onSessionExpired) {
            onSessionExpired()
          } else {
            router.push('/login')
          }
          return false
        }

        logger.info('Session monitor: Session refreshed successfully')
        return true
      }

      // Session is still valid
      return true
    } catch (error) {
      logger.error('Session monitor: Error checking session', error)
      return false
    }
  }, [router, onSessionExpired])

  useEffect(() => {
    if (!enabled) return

    // Check immediately on mount
    checkSession()

    // Set up periodic checking
    const intervalId = setInterval(checkSession, checkInterval)

    // Cleanup on unmount
    return () => clearInterval(intervalId)
  }, [enabled, checkInterval, checkSession])

  return { checkSession }
}
