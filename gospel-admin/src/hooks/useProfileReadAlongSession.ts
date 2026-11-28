'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ProfileListenTextOptions } from '@/lib/profileHighlightVisibleText'
import { isListenOmitHeadingProfileSlug } from '@/lib/profileResourceListenText'
import {
  clearReadAlongDomHighlight,
  repaintReadAlongDomHighlightFromPaint,
  type ReadAlongHighlightPaint,
} from '@/lib/profileReadAlongDomHighlight'
import {
  saveProfileReadAlongLastSession,
  saveProfileReadAlongProgress,
} from '@/lib/profileReadAlongProgressStorage'
import {
  readProfileReadAlongUnderlineStyleFromStorage,
  writeProfileReadAlongUnderlineStyleToStorage,
  type ProfileReadAlongUnderlineStyle,
} from '@/lib/profileReadAlongUnderlineStyleStorage'
import {
  readAlongListenScrollBehavior,
  scrollReadAlongPlainOffsetIntoViewIfNeeded,
} from '@/lib/scrollReadAlongPlain'

export type UseProfileReadAlongSessionOptions = {
  profileSlug?: string
}

export function useProfileReadAlongSession({ profileSlug }: UseProfileReadAlongSessionOptions) {
  const readAlongScopeRef = useRef<HTMLElement | null>(null)
  const readAlongPlainLenRef = useRef(0)
  const readAlongHighlightPaintRef = useRef<ReadAlongHighlightPaint | null>(null)
  const readAlongPendingUiRef = useRef<{
    scroll?: number
    highlight?: ReadAlongHighlightPaint | null
    scrollBehavior?: ScrollBehavior
  }>({})
  const readAlongUiRafRef = useRef(0)
  const readAlongScrollSyncRafRef = useRef(0)
  const readAlongScrollSyncLastYRef = useRef(-1)
  const readAlongScrollSyncStableRef = useRef(0)

  const profileSlugRef = useRef(profileSlug)
  const listenTextOptionsRef = useRef<ProfileListenTextOptions>({})
  const readAlongAnchorIdRef = useRef<string | null>(null)
  const readAlongFingerprintRef = useRef<string | null>(null)
  const lastPersistedPlainOffsetRef = useRef(0)
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const readAlongUnderlineEnabledRef = useRef(true)
  const [readAlongUnderlineOn, setReadAlongUnderlineOn] = useState(true)
  const [readAlongUnderlineStyle, setReadAlongUnderlineStyleState] = useState<ProfileReadAlongUnderlineStyle>(() =>
    typeof window === 'undefined' ? 'word' : readProfileReadAlongUnderlineStyleFromStorage()
  )
  const readAlongUnderlineStyleRef = useRef(readAlongUnderlineStyle)
  const readAlongBoundaryLagSeqRef = useRef(0)

  useLayoutEffect(() => {
    profileSlugRef.current = profileSlug
    listenTextOptionsRef.current = {
      omitHeadingText: isListenOmitHeadingProfileSlug(profileSlug ?? ''),
    }
  }, [profileSlug])

  useLayoutEffect(() => {
    readAlongUnderlineStyleRef.current = readAlongUnderlineStyle
  }, [readAlongUnderlineStyle])

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

  const stopReadAlongHighlightScrollSync = useCallback(() => {
    if (readAlongScrollSyncRafRef.current !== 0) {
      cancelAnimationFrame(readAlongScrollSyncRafRef.current)
      readAlongScrollSyncRafRef.current = 0
    }
    readAlongScrollSyncStableRef.current = 0
    readAlongScrollSyncLastYRef.current = -1
  }, [])

  const cancelReadAlongUiScheduling = useCallback(() => {
    if (readAlongUiRafRef.current !== 0) {
      cancelAnimationFrame(readAlongUiRafRef.current)
      readAlongUiRafRef.current = 0
    }
    stopReadAlongHighlightScrollSync()
    readAlongPendingUiRef.current = {}
  }, [stopReadAlongHighlightScrollSync])

  const repaintStoredReadAlongHighlight = useCallback(() => {
    const hl = readAlongHighlightPaintRef.current
    const scope = readAlongScopeRef.current
    const plainLen = readAlongPlainLenRef.current
    if (!hl || !scope || plainLen <= 0) return
    if (hl.kind === 'word' && hl.endExclusive <= hl.start) return
    repaintReadAlongDomHighlightFromPaint({
      scope,
      plainCollapsedLen: plainLen,
      paint: hl,
      listenTextOptions: listenTextOptionsRef.current,
    })
  }, [])

  const scheduleReadAlongHighlightScrollSync = useCallback(() => {
    if (typeof window === 'undefined') return
    if (!readAlongHighlightPaintRef.current) return

    const tick = () => {
      if (!readAlongHighlightPaintRef.current) {
        stopReadAlongHighlightScrollSync()
        return
      }
      repaintStoredReadAlongHighlight()
      const y = window.scrollY
      if (readAlongScrollSyncLastYRef.current === y) {
        readAlongScrollSyncStableRef.current += 1
        if (readAlongScrollSyncStableRef.current >= 2) {
          stopReadAlongHighlightScrollSync()
          return
        }
      } else {
        readAlongScrollSyncLastYRef.current = y
        readAlongScrollSyncStableRef.current = 0
      }
      readAlongScrollSyncRafRef.current = requestAnimationFrame(tick)
    }

    if (readAlongScrollSyncRafRef.current !== 0) {
      cancelAnimationFrame(readAlongScrollSyncRafRef.current)
    }
    readAlongScrollSyncLastYRef.current = window.scrollY
    readAlongScrollSyncStableRef.current = 0
    readAlongScrollSyncRafRef.current = requestAnimationFrame(tick)
  }, [repaintStoredReadAlongHighlight, stopReadAlongHighlightScrollSync])

  const scheduleReadAlongUi = useCallback(
    (patch: {
      scroll?: number
      highlight?: ReadAlongHighlightPaint | null
      scrollBehavior?: ScrollBehavior
    }) => {
      const acc = readAlongPendingUiRef.current
      if (patch.scroll !== undefined) acc.scroll = patch.scroll
      if (patch.highlight !== undefined) acc.highlight = patch.highlight
      if (patch.scrollBehavior !== undefined) acc.scrollBehavior = patch.scrollBehavior

      if (readAlongUiRafRef.current !== 0) return
      readAlongUiRafRef.current = requestAnimationFrame(() => {
        readAlongUiRafRef.current = 0
        const pending = readAlongPendingUiRef.current
        readAlongPendingUiRef.current = {}

        const scope = readAlongScopeRef.current
        const plainLen = readAlongPlainLenRef.current

        const highlightPending = pending.highlight
        if (highlightPending !== undefined) {
          if (highlightPending === null) {
            readAlongHighlightPaintRef.current = null
            if (typeof document !== 'undefined') clearReadAlongDomHighlight(document)
          } else if (scope && plainLen > 0) {
            readAlongHighlightPaintRef.current = highlightPending
          }
        }

        const scrollNeeded = pending.scroll !== undefined && scope && plainLen > 0
        if (scrollNeeded) {
          scrollReadAlongPlainOffsetIntoViewIfNeeded(
            scope,
            plainLen,
            pending.scroll!,
            readAlongListenScrollBehavior(),
            listenTextOptionsRef.current
          )
        }

        if (highlightPending === null) {
          return
        }

        const hasPaint = Boolean(readAlongHighlightPaintRef.current && scope && plainLen > 0)
        if (!hasPaint) {
          return
        }

        if (scrollNeeded) {
          scheduleReadAlongHighlightScrollSync()
        } else if (highlightPending !== undefined) {
          repaintStoredReadAlongHighlight()
        }
      })
    },
    [repaintStoredReadAlongHighlight, scheduleReadAlongHighlightScrollSync]
  )

  const clearReadAlongSession = useCallback(() => {
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current)
      persistTimerRef.current = null
    }
    cancelReadAlongUiScheduling()
    readAlongHighlightPaintRef.current = null
    if (typeof document !== 'undefined') clearReadAlongDomHighlight(document)
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
    if (typeof document !== 'undefined') clearReadAlongDomHighlight(document)
  }, [cancelReadAlongUiScheduling, flushReadAlongProgressPersist])

  useEffect(() => {
    if (typeof window === 'undefined') return
    let raf = 0
    const onViewportChange = () => {
      if (raf !== 0) return
      raf = requestAnimationFrame(() => {
        raf = 0
        repaintStoredReadAlongHighlight()
        scheduleReadAlongHighlightScrollSync()
      })
    }
    window.addEventListener('scroll', onViewportChange, { passive: true })
    window.addEventListener('resize', onViewportChange)
    const vv = window.visualViewport
    vv?.addEventListener('scroll', onViewportChange)
    vv?.addEventListener('resize', onViewportChange)
    return () => {
      window.removeEventListener('scroll', onViewportChange)
      window.removeEventListener('resize', onViewportChange)
      vv?.removeEventListener('scroll', onViewportChange)
      vv?.removeEventListener('resize', onViewportChange)
      if (raf !== 0) cancelAnimationFrame(raf)
      stopReadAlongHighlightScrollSync()
    }
  }, [repaintStoredReadAlongHighlight, scheduleReadAlongHighlightScrollSync, stopReadAlongHighlightScrollSync])

  const toggleReadAlongUnderline = useCallback(() => {
    setReadAlongUnderlineOn((prev) => {
      const next = !prev
      readAlongUnderlineEnabledRef.current = next
      if (!next) {
        readAlongHighlightPaintRef.current = null
        if (typeof document !== 'undefined') clearReadAlongDomHighlight(document)
        scheduleReadAlongUi({ highlight: null })
      }
      return next
    })
  }, [scheduleReadAlongUi])

  const setReadAlongUnderlineStyle = useCallback(
    (style: ProfileReadAlongUnderlineStyle) => {
      readAlongUnderlineStyleRef.current = style
      setReadAlongUnderlineStyleState(style)
      writeProfileReadAlongUnderlineStyleToStorage(style)
    },
    []
  )

  return {
    profileSlugRef,
    readAlongScopeRef,
    readAlongPlainLenRef,
    readAlongHighlightPaintRef,
    readAlongAnchorIdRef,
    readAlongFingerprintRef,
    lastPersistedPlainOffsetRef,
    persistTimerRef,
    readAlongUnderlineEnabledRef,
    readAlongUnderlineStyleRef,
    readAlongBoundaryLagSeqRef,
    listenTextOptionsRef,
    flushReadAlongProgressPersist,
    recordReadAlongProgressPlainOffset,
    scheduleReadAlongUi,
    cancelReadAlongUiScheduling,
    clearReadAlongSession,
    teardownReadAlong,
    readAlongUnderlineOn,
    toggleReadAlongUnderline,
    readAlongUnderlineStyle,
    setReadAlongUnderlineStyle,
  }
}
