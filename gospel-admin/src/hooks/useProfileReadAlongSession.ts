'use client'

import { useCallback, useLayoutEffect, useRef } from 'react'
import type { ProfileListenTextOptions } from '@/lib/profileHighlightVisibleText'
import { isListenOmitHeadingProfileSlug } from '@/lib/profileResourceListenText'
import {
  saveProfileReadAlongLastSession,
  saveProfileReadAlongProgress,
} from '@/lib/profileReadAlongProgressStorage'
import {
  resetResourceListenWindowScrollState,
  scrollReadAlongPlainOffsetToVerticalCenter,
  type ResourceListenWindowScrollState,
} from '@/lib/scrollReadAlongPlain'
import type { ProfileListenReadAlongUiPatch } from '@/lib/profileListenReadAlongUi'

export type UseProfileReadAlongSessionOptions = {
  profileSlug?: string
}

export function useProfileReadAlongSession({ profileSlug }: UseProfileReadAlongSessionOptions) {
  const readAlongScopeRef = useRef<HTMLElement | null>(null)
  const readAlongPlainLenRef = useRef(0)
  const readAlongPendingScrollRef = useRef<number | undefined>(undefined)
  const readAlongUiRafRef = useRef(0)

  const profileSlugRef = useRef(profileSlug)
  const listenTextOptionsRef = useRef<ProfileListenTextOptions>({})
  const readAlongAnchorIdRef = useRef<string | null>(null)
  const readAlongFingerprintRef = useRef<string | null>(null)
  const lastPersistedPlainOffsetRef = useRef(0)
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const readAlongBoundaryLagSeqRef = useRef(0)
  const readAlongScrollLineStateRef = useRef<ResourceListenWindowScrollState>({
    lastVisualLineKey: null,
  })

  useLayoutEffect(() => {
    profileSlugRef.current = profileSlug
    listenTextOptionsRef.current = {
      omitHeadingText: isListenOmitHeadingProfileSlug(profileSlug ?? ''),
    }
  }, [profileSlug])

  const flushReadAlongProgressPersist = useCallback(() => {
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current)
      persistTimerRef.current = null
    }
    const slug = profileSlugRef.current
    if (!slug) return
    const anchor = readAlongAnchorIdRef.current
    const fp = readAlongFingerprintRef.current
    const plainLen = readAlongPlainLenRef.current
    const off = lastPersistedPlainOffsetRef.current
    if (!anchor || !fp || plainLen <= 0 || off < 0) return
    if (off >= plainLen) return
    saveProfileReadAlongProgress(slug, anchor, off, fp)
    saveProfileReadAlongLastSession(slug, anchor, off, fp)
  }, [])

  const scheduleReadAlongProgressPersist = useCallback(() => {
    if (!profileSlugRef.current) return
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
    persistTimerRef.current = setTimeout(() => {
      persistTimerRef.current = null
      flushReadAlongProgressPersist()
    }, 450)
  }, [flushReadAlongProgressPersist])

  const recordReadAlongProgressPlainOffset = useCallback(
    (plainOffset: number, ttsActive: boolean) => {
      if (!profileSlugRef.current || !ttsActive) return
      const plainLen = readAlongPlainLenRef.current
      if (plainLen <= 0) return
      const clamped = Math.max(0, Math.min(plainOffset, plainLen - 1))
      lastPersistedPlainOffsetRef.current = Math.max(lastPersistedPlainOffsetRef.current, clamped)
      scheduleReadAlongProgressPersist()
    },
    [scheduleReadAlongProgressPersist]
  )

  const cancelReadAlongUiScheduling = useCallback(() => {
    if (readAlongUiRafRef.current !== 0) {
      cancelAnimationFrame(readAlongUiRafRef.current)
      readAlongUiRafRef.current = 0
    }
    readAlongPendingScrollRef.current = undefined
  }, [])

  const scheduleReadAlongUi = useCallback((patch: ProfileListenReadAlongUiPatch | { scroll?: number }) => {
    if (patch.scroll !== undefined) {
      readAlongPendingScrollRef.current = patch.scroll
    }

    if (readAlongUiRafRef.current !== 0) return
    readAlongUiRafRef.current = requestAnimationFrame(() => {
      readAlongUiRafRef.current = 0
      const scrollTarget = readAlongPendingScrollRef.current
      readAlongPendingScrollRef.current = undefined

      const scope = readAlongScopeRef.current
      const plainLen = readAlongPlainLenRef.current
      if (scrollTarget === undefined || !scope || plainLen <= 0) return

      scrollReadAlongPlainOffsetToVerticalCenter(
        scope,
        plainLen,
        scrollTarget,
        listenTextOptionsRef.current,
        { lineScrollState: readAlongScrollLineStateRef.current }
      )
    })
  }, [])

  const clearReadAlongSession = useCallback(() => {
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current)
      persistTimerRef.current = null
    }
    cancelReadAlongUiScheduling()
    resetResourceListenWindowScrollState(readAlongScrollLineStateRef.current)
    readAlongScopeRef.current = null
    readAlongPlainLenRef.current = 0
    readAlongAnchorIdRef.current = null
    readAlongFingerprintRef.current = null
    lastPersistedPlainOffsetRef.current = 0
    readAlongBoundaryLagSeqRef.current += 1
  }, [cancelReadAlongUiScheduling])

  const teardownReadAlong = useCallback(() => {
    readAlongBoundaryLagSeqRef.current += 1
    flushReadAlongProgressPersist()
    cancelReadAlongUiScheduling()
    resetResourceListenWindowScrollState(readAlongScrollLineStateRef.current)
  }, [cancelReadAlongUiScheduling, flushReadAlongProgressPersist])

  return {
    profileSlugRef,
    readAlongScopeRef,
    readAlongPlainLenRef,
    readAlongAnchorIdRef,
    readAlongFingerprintRef,
    lastPersistedPlainOffsetRef,
    persistTimerRef,
    readAlongBoundaryLagSeqRef,
    listenTextOptionsRef,
    flushReadAlongProgressPersist,
    recordReadAlongProgressPlainOffset,
    scheduleReadAlongUi,
    cancelReadAlongUiScheduling,
    clearReadAlongSession,
    teardownReadAlong,
  }
}