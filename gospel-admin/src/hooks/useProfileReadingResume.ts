'use client'

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import type { useRouter } from 'next/navigation'
import type { GospelSection } from '@/lib/types'
import { GOSPEL_SYNC_FLUSH_REQUEST_EVENT } from '@/lib/gospelDeviceSync/constants'
import {
  captureReadingPositionAtViewport,
  isReadingPositionAheadOf,
} from '@/lib/profileReadingPosition'
import { getOrderedTocAnchorIds } from '@/lib/tocAnchorFromScroll'
import {
  loadProfileReadingResume,
  saveProfileReadingResume,
  type ProfileReadingResumeV1,
} from '@/lib/profileReadingResumeStorage'
import { readingResumeForScrollTopGuard } from '@/lib/profileReadingResumeRestore'
import { markProfileResourceTabNavigation } from '@/lib/profileResourceTabNavigation'
import { removeProfileResourceTab, resolveProfileTabNavigationAfterClose } from '@/lib/profileLastOpenResourceStorage'
import { useProfileReadingResumeRestore } from '@/hooks/useProfileReadingResumeRestore'

export type UseProfileReadingResumeOptions = {
  isHydrated: boolean
  profileSlug: string
  sectionCount: number
  sections: GospelSection[]
  selectedScriptureIsOpen: boolean
  studyRefParam: string
  mcheynePlanDayParam: string
  mcheyneResumePinParam: string
  onReadingResumeSettled?: () => void
  router: ReturnType<typeof useRouter>
  clearResourceSearch?: () => void
}

export function useProfileReadingResume({
  isHydrated,
  profileSlug,
  sectionCount,
  sections,
  selectedScriptureIsOpen,
  studyRefParam,
  mcheynePlanDayParam,
  mcheyneResumePinParam,
  onReadingResumeSettled,
  router,
  clearResourceSearch,
}: UseProfileReadingResumeOptions) {
  const profileReadingNavAppliedRef = useRef(false)
  const readingResumeSaveTimerRef = useRef<number | null>(null)
  const readingResumeSaveIdleRef = useRef<number | null>(null)
  const readingResumeSaveUsesIdleCallbackRef = useRef(false)
  const flushReadingResumeSaveRef = useRef<(reason?: string) => void>(() => {})
  const lastSavedReadingResumeRef = useRef<ProfileReadingResumeV1 | null>(null)
  const lastSavedReadingResumeSlugRef = useRef<string | null>(null)
  const readingResumeAppVisibleRestoreKeyRef = useRef<string | null>(null)
  const tryAppResumeReadingRestoreRef = useRef<() => void>(() => {})

  const flushReadingResumeSave = useCallback(
    (flushReason?: string) => {
      if (!profileSlug || sectionCount === 0) return
      if (selectedScriptureIsOpen) return
      if (typeof document !== 'undefined' && document.querySelector('.profile-help-tour-popover')) {
        return
      }

      let captured
      try {
        captured = captureReadingPositionAtViewport(sections, profileSlug)
      } catch {
        return
      }
      if (!captured) return

      const scrollTopGuardReasons = new Set([
        'tab-select-leave',
        'visibility-hide',
        'pagehide',
        'beforeunload',
        'window-blur',
      ])
      if (
        flushReason &&
        scrollTopGuardReasons.has(flushReason) &&
        typeof window !== 'undefined' &&
        window.scrollY <= 8
      ) {
        const existing = readingResumeForScrollTopGuard(
          profileSlug,
          loadProfileReadingResume(profileSlug),
          lastSavedReadingResumeSlugRef.current,
          lastSavedReadingResumeRef.current
        )
        if (existing) {
          const orderedIds = getOrderedTocAnchorIds(sections)
          if (isReadingPositionAheadOf(existing, captured, orderedIds)) {
            return
          }
        }
      }

      saveProfileReadingResume(
        profileSlug,
        captured.anchorId,
        captured.plainOffset,
        captured.fingerprint
      )
      lastSavedReadingResumeRef.current = {
        v: 1,
        anchorId: captured.anchorId,
        plainOffset: captured.plainOffset,
        fingerprint: captured.fingerprint,
      }
      lastSavedReadingResumeSlugRef.current = profileSlug
    },
    [profileSlug, sectionCount, sections, selectedScriptureIsOpen]
  )

  useLayoutEffect(() => {
    flushReadingResumeSaveRef.current = flushReadingResumeSave
  }, [flushReadingResumeSave])

  const READING_RESUME_SAVE_DEBOUNCE_MS = 1500

  const cancelPendingReadingResumeSave = useCallback(() => {
    if (readingResumeSaveTimerRef.current != null) {
      window.clearTimeout(readingResumeSaveTimerRef.current)
      readingResumeSaveTimerRef.current = null
    }
    const idleId = readingResumeSaveIdleRef.current
    if (idleId == null) return
    readingResumeSaveIdleRef.current = null
    if (readingResumeSaveUsesIdleCallbackRef.current && typeof cancelIdleCallback === 'function') {
      cancelIdleCallback(idleId)
    } else {
      window.cancelAnimationFrame(idleId)
    }
  }, [])

  const scheduleFlushReadingResumeSave = useCallback(() => {
    const run = () => {
      readingResumeSaveIdleRef.current = null
      flushReadingResumeSaveRef.current()
    }
    if (typeof requestIdleCallback === 'function') {
      readingResumeSaveUsesIdleCallbackRef.current = true
      readingResumeSaveIdleRef.current = requestIdleCallback(run, { timeout: 3000 })
      return
    }
    readingResumeSaveUsesIdleCallbackRef.current = false
    readingResumeSaveIdleRef.current = window.requestAnimationFrame(run)
  }, [])

  const persistReadingResumeBeforeLeave = useCallback(
    (persistReason?: string) => {
      cancelPendingReadingResumeSave()
      flushReadingResumeSave(persistReason)
    },
    [cancelPendingReadingResumeSave, flushReadingResumeSave]
  )

  const handleSelectResourceTab = useCallback(
    (slug: string) => {
      const trimmed = slug.trim()
      if (!trimmed || trimmed === profileSlug.trim()) return
      clearResourceSearch?.()
      persistReadingResumeBeforeLeave('tab-select-leave')
      const saved = loadProfileReadingResume(trimmed)
      markProfileResourceTabNavigation(trimmed, saved)
      router.push(`/${trimmed}`, { scroll: false })
    },
    [profileSlug, router, persistReadingResumeBeforeLeave, clearResourceSearch]
  )

  const handleCloseResourceTab = useCallback(
    (slug: string) => {
      const trimmed = slug.trim()
      if (!trimmed) return
      const isActive = trimmed === profileSlug.trim()
      const nextSlug = isActive ? resolveProfileTabNavigationAfterClose(trimmed) : null
      removeProfileResourceTab(trimmed)
      if (isActive) {
        clearResourceSearch?.()
        persistReadingResumeBeforeLeave()
        if (nextSlug) {
          const saved = loadProfileReadingResume(nextSlug)
          markProfileResourceTabNavigation(nextSlug, saved)
          router.push(`/${nextSlug}`, { scroll: false })
        } else {
          router.push('/default', { scroll: false })
        }
      }
    },
    [profileSlug, router, persistReadingResumeBeforeLeave, clearResourceSearch]
  )

  const { tryAppResumeReadingRestore } = useProfileReadingResumeRestore({
    isHydrated,
    profileSlug,
    sectionCount,
    sections,
    selectedScriptureIsOpen,
    studyRefParam,
    mcheynePlanDayParam,
    mcheyneResumePinParam,
    onReadingResumeSettled,
    profileReadingNavAppliedRef,
    readingResumeAppVisibleRestoreKeyRef,
    lastSavedReadingResumeRef,
    lastSavedReadingResumeSlugRef,
  })

  useEffect(() => {
    tryAppResumeReadingRestoreRef.current = tryAppResumeReadingRestore
  }, [tryAppResumeReadingRestore])

  useEffect(() => {
    if (!isHydrated || !profileSlug || sectionCount === 0) return

    const scheduleSave = () => {
      if (typeof window !== 'undefined' && window.scrollY > 64) {
        readingResumeAppVisibleRestoreKeyRef.current = null
      }
      cancelPendingReadingResumeSave()
      readingResumeSaveTimerRef.current = window.setTimeout(() => {
        readingResumeSaveTimerRef.current = null
        scheduleFlushReadingResumeSave()
      }, READING_RESUME_SAVE_DEBOUNCE_MS)
    }

    window.addEventListener('scroll', scheduleSave, { passive: true })

    const requestSyncFlush = () => {
      window.dispatchEvent(new CustomEvent(GOSPEL_SYNC_FLUSH_REQUEST_EVENT))
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        readingResumeAppVisibleRestoreKeyRef.current = null
        persistReadingResumeBeforeLeave('visibility-hide')
        requestSyncFlush()
        return
      }
      if (document.visibilityState === 'visible') {
        tryAppResumeReadingRestoreRef.current()
      }
    }
    const onPageHide = () => {
      persistReadingResumeBeforeLeave('pagehide')
      requestSyncFlush()
    }
    const onBeforeUnload = () => {
      persistReadingResumeBeforeLeave('beforeunload')
      requestSyncFlush()
    }
    const onWindowBlur = () => {
      persistReadingResumeBeforeLeave('window-blur')
      requestSyncFlush()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('beforeunload', onBeforeUnload)
    window.addEventListener('blur', onWindowBlur)

    return () => {
      window.removeEventListener('scroll', scheduleSave)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('beforeunload', onBeforeUnload)
      window.removeEventListener('blur', onWindowBlur)
      cancelPendingReadingResumeSave()
    }
  }, [
    isHydrated,
    profileSlug,
    sectionCount,
    cancelPendingReadingResumeSave,
    persistReadingResumeBeforeLeave,
    scheduleFlushReadingResumeSave,
  ])

  return {
    handleSelectResourceTab,
    handleCloseResourceTab,
    persistReadingResumeBeforeLeave,
  }
}
