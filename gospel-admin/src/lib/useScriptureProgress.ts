import { useState, useCallback, useEffect, useRef } from 'react'
import { GospelProfile } from './types'
import { logger } from './logger'

const SCRIPTURE_PROGRESS_KEY_PREFIX = 'gospel-scripture-progress-'

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

function profileLastViewedMatchesLocal(
  profilePin: GospelProfile['lastViewedScripture'] | undefined,
  local: ScriptureProgress | null
): boolean {
  if (!profilePin || !local) return false
  return (
    profilePin.reference === local.reference &&
    (profilePin.sectionId || '') === (local.sectionId || '') &&
    (profilePin.subsectionId || '') === (local.subsectionId || '')
  )
}

function parseStoredProgress(value: string | null): ScriptureProgress | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    if (parsed?.reference) {
      return {
        reference: parsed.reference,
        sectionId: parsed.sectionId || '',
        subsectionId: parsed.subsectionId || '',
        viewedAt: parsed.viewedAt ? new Date(parsed.viewedAt) : new Date()
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Hook for tracking scripture reading progress for non-default profiles.
 * Uses localStorage first; syncs to DB when logged in.
 */
export function useScriptureProgress(
  profile: GospelProfile | null,
  isLoggedIn = false
): UseScriptureProgressReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localProgress, setLocalProgress] = useState<ScriptureProgress | null>(null)
  /** After reset, RSC `profile.lastViewedScripture` can stay stale until `router.refresh()`; do not merge it back in. */
  const [suppressProfileLastViewed, setSuppressProfileLastViewed] = useState(false)
  const localProgressRef = useRef<ScriptureProgress | null>(null)
  useEffect(() => {
    localProgressRef.current = localProgress
  }, [localProgress])

  const shouldTrack = profile && !profile.isDefault
  const storageKey = profile?.slug ? `${SCRIPTURE_PROGRESS_KEY_PREFIX}${profile.slug}` : null

  useEffect(() => {
    if (!profile?.lastViewedScripture) {
      setSuppressProfileLastViewed(false)
    }
  }, [profile?.lastViewedScripture])

  useEffect(() => {
    setSuppressProfileLastViewed(false)
  }, [profile?.slug])

  /** Clear suppression once RSC `profile.lastViewedScripture` matches what we already have locally (server caught up). */
  useEffect(() => {
    if (!suppressProfileLastViewed || !localProgress || !profile?.lastViewedScripture) return
    if (profileLastViewedMatchesLocal(profile.lastViewedScripture, localProgress)) {
      setSuppressProfileLastViewed(false)
    }
  }, [suppressProfileLastViewed, localProgress, profile?.lastViewedScripture])

  // Load: localStorage first; if logged in and profile.lastViewedScripture exists, prefer DB and update localStorage
  useEffect(() => {
    if (!storageKey) return

    const fromStorage = parseStoredProgress(typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null)

    if (isLoggedIn && profile?.lastViewedScripture && !suppressProfileLastViewed) {
      const fromDb: ScriptureProgress = {
        reference: profile.lastViewedScripture.reference,
        sectionId: profile.lastViewedScripture.sectionId || '',
        subsectionId: profile.lastViewedScripture.subsectionId || '',
        viewedAt: profile.lastViewedScripture.viewedAt instanceof Date
          ? profile.lastViewedScripture.viewedAt
          : new Date(profile.lastViewedScripture.viewedAt as string)
      }
      setLocalProgress(fromDb)
      try {
        localStorage.setItem(storageKey, JSON.stringify({
          reference: fromDb.reference,
          sectionId: fromDb.sectionId,
          subsectionId: fromDb.subsectionId,
          viewedAt: fromDb.viewedAt
        }))
      } catch {
        // ignore
      }
    } else {
      setLocalProgress(fromStorage)
    }
  }, [storageKey, isLoggedIn, profile?.lastViewedScripture, profile?.slug, suppressProfileLastViewed])

  const trackScriptureView = useCallback(async (
    reference: string,
    sectionId: string,
    subsectionId: string
  ) => {
    // ScriptureModal calls onScriptureViewed after fetch with placeholder anchors. Do not overwrite
    // a row we just wrote from a page scripture click (real section ids)—especially for anonymous users
    // where localStorage is the only store.
    const isModalPlaceholder = sectionId === 'modal-view' && subsectionId === 'modal-view'
    const prevSnap = localProgressRef.current
    if (
      isModalPlaceholder &&
      prevSnap &&
      prevSnap.reference === reference &&
      prevSnap.sectionId !== 'modal-view' &&
      prevSnap.subsectionId !== 'modal-view'
    ) {
      return
    }

    const progressData: ScriptureProgress = {
      reference,
      sectionId,
      subsectionId,
      viewedAt: new Date()
    }

    // Always write to localStorage
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(progressData))
        // Do not call setSuppressProfileLastViewed(false) here: the load effect would run while
        // `profile.lastViewedScripture` can still be stale and overwrite this row. Suppression clears
        // when the profile field is empty, the slug changes, or it matches `localProgress` (see effect above).
        setLocalProgress(progressData)
        localProgressRef.current = progressData
      } catch {
        // ignore
      }
    }

    // If logged in and should track, also sync to DB
    if (!shouldTrack || !profile || !isLoggedIn) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/profiles/${profile.slug}/scripture-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(progressData)
      })

      if (!response.ok) {
        throw new Error(`Failed to track scripture progress: ${response.status}`)
      }

      logger.debug(`[useScriptureProgress] Tracked view: ${reference}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to track scripture progress'
      logger.error('[useScriptureProgress] Error:', errorMessage)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [profile, shouldTrack, isLoggedIn, storageKey])

  const resetProgress = useCallback(async () => {
    setSuppressProfileLastViewed(true)
    // Always clear localStorage
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey)
        setLocalProgress(null)
        localProgressRef.current = null
      } catch {
        // ignore
      }
    }

    // If logged in and should track, also call DELETE API
    if (!shouldTrack || !profile || !isLoggedIn) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/profiles/${profile.slug}/scripture-progress`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`Failed to reset progress: ${response.status}`)
      }

      logger.debug(`[useScriptureProgress] Reset progress for profile: ${profile.slug}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset progress'
      logger.error('[useScriptureProgress] Error:', errorMessage)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [profile, shouldTrack, isLoggedIn, storageKey])

  // Merged: prefer local row; when cleared (null), ignore stale RSC profile while suppressProfileLastViewed is true.
  const lastViewedScripture: ScriptureProgress | null =
    localProgress != null
      ? localProgress
      : suppressProfileLastViewed
        ? null
        : profile?.lastViewedScripture ?? null

  return {
    trackScriptureView,
    resetProgress,
    lastViewedScripture,
    isLoading,
    error
  }
}