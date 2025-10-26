import { useState, useCallback } from 'react'
import { GospelProfile } from './types'

interface ScriptureProgress {
  reference: string
  sectionId: string
  subsectionId: string
  viewedAt: Date
}

interface UseScriptureProgressReturn {
  trackScriptureView: (reference: string, sectionId: string, subsectionId: string) => Promise<void>
  resetProgress: () => Promise<void>
  lastViewedScripture: ScriptureProgress | null
  isLoading: boolean
  error: string | null
}

/**
 * Hook for tracking scripture reading progress for non-default profiles
 */
export function useScriptureProgress(
  profile: GospelProfile | null
): UseScriptureProgressReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Don't track progress for default profile or when no profile
  const shouldTrack = profile && !profile.isDefault

  const trackScriptureView = useCallback(async (
    reference: string,
    sectionId: string,
    subsectionId: string
  ) => {
    if (!shouldTrack) return

    setIsLoading(true)
    setError(null)

    try {
      const progressData: ScriptureProgress = {
        reference,
        sectionId,
        subsectionId,
        viewedAt: new Date()
      }

      const response = await fetch(`/api/profiles/${profile.slug}/scripture-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(progressData)
      })

      if (!response.ok) {
        throw new Error(`Failed to track scripture progress: ${response.status}`)
      }

      console.log(`[useScriptureProgress] Tracked view: ${reference}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to track scripture progress'
      console.error('[useScriptureProgress] Error:', errorMessage)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [profile, shouldTrack])

  const resetProgress = useCallback(async () => {
    if (!shouldTrack) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/profiles/${profile.slug}/scripture-progress`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`Failed to reset scripture progress: ${response.status}`)
      }

      console.log(`[useScriptureProgress] Reset progress for profile: ${profile.slug}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset scripture progress'
      console.error('[useScriptureProgress] Error:', errorMessage)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [profile, shouldTrack])

  return {
    trackScriptureView,
    resetProgress,
    lastViewedScripture: profile?.lastViewedScripture || null,
    isLoading,
    error
  }
}