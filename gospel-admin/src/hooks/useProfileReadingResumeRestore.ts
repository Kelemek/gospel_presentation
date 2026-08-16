'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, type MutableRefObject } from 'react'
import type { GospelSection } from '@/lib/types'
import { hydrateGospelClientStorage } from '@/lib/gospelClientStorage'
import { GOSPEL_CLIENT_STORAGE_CHANGED_EVENT } from '@/lib/gospelClientStorageEvents'
import { DEVICE_SYNC_STATE_CHANGED_EVENT } from '@/lib/gospelDeviceSync/dirty'
import { waitForDeviceSyncStartupPull } from '@/lib/gospelDeviceSync/waitForStartupPull'
import { consumePendingBookmarkResume } from '@/lib/profileBookmarkResumeSession'
import {
  restoreReadingPosition,
  resolveReadingScope,
  shouldRestoreProfileMenuReadingTop,
} from '@/lib/profileReadingPosition'
import {
  clearProfileReadingResume,
  loadProfileReadingResume,
  profileReadingResumeStorageKey,
  type ProfileReadingResumeV1,
} from '@/lib/profileReadingResumeStorage'
import { runReadingResumeRestoreWithFingerprintRetry } from '@/lib/profileReadingResumeRestore'
import {
  clearProfileResourceTabNavigationStaging,
  peekProfileResourceTabNavigation,
} from '@/lib/profileResourceTabNavigation'
import {
  shouldDeferToStudyOrHashNavigation,
  shouldRestoreStoredReadingResumeAtScrollY,
  shouldSkipStoredReadingResumeRestore,
} from '@/lib/profileReadingResumeRestoreGuards'

type TabNavStagingRef =
  | { status: 'unset' }
  | { status: 'not-tab-nav' }
  | { status: 'ready'; resume: ProfileReadingResumeV1 | null }

export type UseProfileReadingResumeRestoreOptions = {
  isHydrated: boolean
  profileSlug: string
  sectionCount: number
  sections: GospelSection[]
  selectedScriptureIsOpen: boolean
  studyRefParam: string
  mcheynePlanDayParam: string
  mcheyneResumePinParam: string
  onReadingResumeSettled?: () => void
  profileReadingNavAppliedRef: MutableRefObject<boolean>
  readingResumeAppVisibleRestoreKeyRef: MutableRefObject<string | null>
  lastSavedReadingResumeRef: MutableRefObject<ProfileReadingResumeV1 | null>
  lastSavedReadingResumeSlugRef: MutableRefObject<string | null>
}

export function useProfileReadingResumeRestore({
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
}: UseProfileReadingResumeRestoreOptions) {
  const profileReadingNavSlugRef = useRef<string | null>(null)
  const readingResumeRestoreSessionRef = useRef<{
    cancelScroll: () => void
    abortUserIntent: AbortController
  } | null>(null)
  const appVisibleRestoreCancelRef = useRef<(() => void) | null>(null)
  const profileSlugRef = useRef('')
  const tabNavStagingRef = useRef<TabNavStagingRef>({ status: 'unset' })
  const tabNavLayoutSlugRef = useRef<string | null>(null)

  useEffect(() => {
    if (profileReadingNavSlugRef.current !== profileSlug) {
      const hadPreviousSlug = profileReadingNavSlugRef.current != null
      profileReadingNavSlugRef.current = profileSlug
      if (hadPreviousSlug) {
        profileReadingNavAppliedRef.current = false
      }
    }
  }, [profileSlug, profileReadingNavAppliedRef])

  const cancelReadingResumeRestore = useCallback(() => {
    const session = readingResumeRestoreSessionRef.current
    if (!session) return
    session.abortUserIntent.abort()
    session.cancelScroll()
    readingResumeRestoreSessionRef.current = null
  }, [])

  const startReadingResumeRestore = useCallback(
    (
      anchorId: string,
      plainOffset: number,
      fingerprint: string,
      onSettled?: () => void,
      restoreProfileSlug: string = profileSlug
    ) => {
      cancelReadingResumeRestore()
      const abortUserIntent = new AbortController()
      const cancelScroll = restoreReadingPosition(
        anchorId,
        plainOffset,
        fingerprint,
        restoreProfileSlug,
        {
          onDone: () => onSettled?.(),
          onGiveUp: () => onSettled?.(),
        }
      )
      readingResumeRestoreSessionRef.current = { cancelScroll, abortUserIntent }

      const stopOnUserIntent = () => {
        if (readingResumeRestoreSessionRef.current?.abortUserIntent !== abortUserIntent) return
        cancelReadingResumeRestore()
      }
      const intentOpts = { passive: true, signal: abortUserIntent.signal } as const
      window.addEventListener('wheel', stopOnUserIntent, intentOpts)
      window.addEventListener('touchstart', stopOnUserIntent, intentOpts)
    },
    [cancelReadingResumeRestore, profileSlug]
  )

  const startReadingResumeRestoreRef = useRef(startReadingResumeRestore)
  const onReadingResumeSettledRef = useRef(onReadingResumeSettled)

  const shouldRestoreStoredReadingResume = useCallback(
    (
      saved: ProfileReadingResumeV1,
      options: { allowWhenAheadOfViewport?: boolean }
    ): boolean => {
      if (typeof window === 'undefined') return false
      return shouldRestoreStoredReadingResumeAtScrollY(
        saved,
        sections,
        profileSlug,
        window.scrollY,
        options
      )
    },
    [profileSlug, sections]
  )

  const runStoredReadingResumeRestore = useCallback(
    (slugForRestore: string, saved: ProfileReadingResumeV1) => {
      const restoreKey = `${slugForRestore}:${saved.anchorId}:${saved.plainOffset}`
      if (readingResumeAppVisibleRestoreKeyRef.current === restoreKey) return

      appVisibleRestoreCancelRef.current?.()
      appVisibleRestoreCancelRef.current = runReadingResumeRestoreWithFingerprintRetry(
        saved,
        slugForRestore,
        {
          onInvalidFingerprint: () => {
            if (profileSlugRef.current !== slugForRestore) return
            const scope = resolveReadingScope(saved.anchorId)
            if (scope) clearProfileReadingResume(slugForRestore)
          },
          onSettled: () => {
            if (profileSlugRef.current !== slugForRestore) return
            readingResumeAppVisibleRestoreKeyRef.current = restoreKey
          },
          onRestore: (resume, onSettled) => {
            if (profileSlugRef.current !== slugForRestore) return
            startReadingResumeRestoreRef.current(
              resume.anchorId,
              resume.plainOffset,
              resume.fingerprint,
              onSettled,
              slugForRestore
            )
          },
        }
      )
    },
    [readingResumeAppVisibleRestoreKeyRef]
  )

  const attemptStoredReadingResumeRestore = useCallback(
    (options: { allowWhenAheadOfViewport?: boolean } = {}) => {
      const locationHash =
        typeof window !== 'undefined' ? window.location.hash.slice(1) : ''

      if (
        shouldSkipStoredReadingResumeRestore({
          profileSlug,
          sectionCount,
          selectedScriptureIsOpen,
          studyRefParam,
          mcheynePlanDayParam,
          mcheyneResumePinParam,
          locationHash,
        })
      ) {
        return
      }

      if (options.allowWhenAheadOfViewport) {
        readingResumeAppVisibleRestoreKeyRef.current = null
      }

      const slugForRestore = profileSlug

      void (async () => {
        await hydrateGospelClientStorage()
        if (profileSlugRef.current !== slugForRestore) return

        const saved = loadProfileReadingResume(slugForRestore)
        if (!saved) return
        if (!shouldRestoreStoredReadingResume(saved, options)) return

        runStoredReadingResumeRestore(slugForRestore, saved)
      })()
    },
    [
      profileSlug,
      sectionCount,
      selectedScriptureIsOpen,
      studyRefParam,
      mcheynePlanDayParam,
      mcheyneResumePinParam,
      shouldRestoreStoredReadingResume,
      runStoredReadingResumeRestore,
      readingResumeAppVisibleRestoreKeyRef,
    ]
  )

  const tryAppResumeReadingRestore = useCallback(() => {
    attemptStoredReadingResumeRestore()
  }, [attemptStoredReadingResumeRestore])

  const trySyncReadingResumeRestore = useCallback(() => {
    attemptStoredReadingResumeRestore({ allowWhenAheadOfViewport: true })
  }, [attemptStoredReadingResumeRestore])

  useLayoutEffect(() => {
    profileSlugRef.current = profileSlug
  }, [profileSlug])

  useEffect(() => {
    lastSavedReadingResumeRef.current = null
    lastSavedReadingResumeSlugRef.current = null
    readingResumeAppVisibleRestoreKeyRef.current = null
    appVisibleRestoreCancelRef.current?.()
    appVisibleRestoreCancelRef.current = null
  }, [
    profileSlug,
    lastSavedReadingResumeRef,
    lastSavedReadingResumeSlugRef,
    readingResumeAppVisibleRestoreKeyRef,
  ])

  useEffect(() => {
    startReadingResumeRestoreRef.current = startReadingResumeRestore
    onReadingResumeSettledRef.current = onReadingResumeSettled
  }, [startReadingResumeRestore, onReadingResumeSettled])

  useEffect(() => {
    if (!isHydrated || !profileSlug || sectionCount === 0) return undefined

    const onClientStorageChanged = (event: Event) => {
      const key = (event as CustomEvent<{ key: string }>).detail?.key
      if (!key || key !== profileReadingResumeStorageKey(profileSlug)) return
      trySyncReadingResumeRestore()
    }

    const onDeviceSyncStateChanged = () => {
      trySyncReadingResumeRestore()
    }

    window.addEventListener(GOSPEL_CLIENT_STORAGE_CHANGED_EVENT, onClientStorageChanged)
    window.addEventListener(DEVICE_SYNC_STATE_CHANGED_EVENT, onDeviceSyncStateChanged)
    return () => {
      window.removeEventListener(GOSPEL_CLIENT_STORAGE_CHANGED_EVENT, onClientStorageChanged)
      window.removeEventListener(DEVICE_SYNC_STATE_CHANGED_EVENT, onDeviceSyncStateChanged)
    }
  }, [isHydrated, profileSlug, sectionCount, trySyncReadingResumeRestore])

  useEffect(() => {
    const slugOnMount = profileSlug
    return () => {
      cancelReadingResumeRestore()
      clearProfileResourceTabNavigationStaging(slugOnMount)
    }
  }, [profileSlug, cancelReadingResumeRestore])

  useLayoutEffect(() => {
    if (!isHydrated || sectionCount === 0 || !profileSlug) return

    if (tabNavLayoutSlugRef.current !== profileSlug) {
      tabNavLayoutSlugRef.current = profileSlug
      tabNavStagingRef.current = { status: 'unset' }
    }

    if (tabNavStagingRef.current.status === 'unset') {
      const peeked = peekProfileResourceTabNavigation(profileSlug)
      if (peeked === undefined) {
        tabNavStagingRef.current = { status: 'not-tab-nav' }
        return
      }
      tabNavStagingRef.current = { status: 'ready', resume: peeked }
    }

    if (tabNavStagingRef.current.status === 'not-tab-nav') return

    const tabNavResume = tabNavStagingRef.current.resume

    profileReadingNavAppliedRef.current = true
    const finishTabNavRestore = (options?: { notifySettled?: boolean }) => {
      clearProfileResourceTabNavigationStaging(profileSlug)
      if (options?.notifySettled !== false) {
        onReadingResumeSettledRef.current?.()
      }
    }

    if (tabNavResume === null) {
      finishTabNavRestore()
      return
    }

    const cancelRetry = runReadingResumeRestoreWithFingerprintRetry(tabNavResume, profileSlug, {
      skipRestoreOnInvalidFingerprint: false,
      onRestore: (resume) => {
        const revealSiteHeaderBeforeScroll = shouldRestoreProfileMenuReadingTop(
          resume.anchorId,
          resume.plainOffset
        )
        if (revealSiteHeaderBeforeScroll) {
          onReadingResumeSettledRef.current?.()
        }
        const startRestore = () => {
          startReadingResumeRestoreRef.current(
            resume.anchorId,
            resume.plainOffset,
            resume.fingerprint,
            () => {
              finishTabNavRestore({
                notifySettled: !revealSiteHeaderBeforeScroll,
              })
            }
          )
        }
        if (revealSiteHeaderBeforeScroll) {
          requestAnimationFrame(() => {
            requestAnimationFrame(startRestore)
          })
          return
        }
        startRestore()
      },
    })

    return () => {
      cancelRetry()
    }
  }, [isHydrated, sectionCount, profileSlug, profileReadingNavAppliedRef])

  useEffect(() => {
    if (!isHydrated || sectionCount === 0 || !profileSlug) return

    let cancelled = false

    const timer = window.setTimeout(() => {
      void (async () => {
        await waitForDeviceSyncStartupPull()
        await hydrateGospelClientStorage()
        if (cancelled || profileReadingNavAppliedRef.current) return

        const locationHash = typeof window !== 'undefined' ? window.location.hash.slice(1) : ''
        if (
          shouldDeferToStudyOrHashNavigation({
            studyRefParam,
            mcheynePlanDayParam,
            mcheyneResumePinParam,
            profileSlug,
            locationHash,
          })
        ) {
          profileReadingNavAppliedRef.current = true
          return
        }

        const pending = consumePendingBookmarkResume()
        if (pending) {
          profileReadingNavAppliedRef.current = true
          startReadingResumeRestore(
            pending.anchorId,
            pending.plainOffset,
            pending.fingerprint
          )
          return
        }

        const saved = loadProfileReadingResume(profileSlug)
        if (!saved) {
          profileReadingNavAppliedRef.current = true
          return
        }

        profileReadingNavAppliedRef.current = true
        runReadingResumeRestoreWithFingerprintRetry(saved, profileSlug, {
          onInvalidFingerprint: () => {
            const scope = resolveReadingScope(saved.anchorId)
            if (scope) clearProfileReadingResume(profileSlug)
          },
          onRestore: (resume) => {
            startReadingResumeRestore(
              resume.anchorId,
              resume.plainOffset,
              resume.fingerprint
            )
          },
        })
      })()
    }, 120)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      cancelReadingResumeRestore()
    }
  }, [
    isHydrated,
    sectionCount,
    profileSlug,
    studyRefParam,
    mcheynePlanDayParam,
    mcheyneResumePinParam,
    startReadingResumeRestore,
    cancelReadingResumeRestore,
    profileReadingNavAppliedRef,
  ])

  return {
    tryAppResumeReadingRestore,
    trySyncReadingResumeRestore,
    cancelReadingResumeRestore,
  }
}
