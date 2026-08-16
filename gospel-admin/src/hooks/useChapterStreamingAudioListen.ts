'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import {
  dispatchWebSpeechExclusiveOwner,
  GOSPEL_WEB_SPEECH_EXCLUSIVE_OWNER_EVENT,
  type GospelWebSpeechExclusiveOwnerDetail,
} from '@/lib/exclusiveWebSpeechListen'
import {
  applyMemorizeListenPlaybackRateToMediaElement,
  readMemorizeListenSpeedFromStorage,
  writeMemorizeListenSpeedToStorage,
  type MemorizeListenSpeed,
} from '@/lib/memorizeListenSpeedStorage'
import {
  advanceScriptureListenIntegratedPlaybackTime,
  applyScriptureListenContinuousScrollTop,
  computeScriptureListenProportionalScrollTop,
  getScrollContainerMaxScrollTop,
  isScrollContainerAtBottom,
  scriptureListenPlaybackFractionForScroll,
  SCRIPTURE_LISTEN_SCROLL_BOTTOM_EPSILON_PX,
} from '@/lib/scrollReadAlongPlain'
import { computeScriptureListenAutoScrollStartDelaySec } from '@/lib/scriptureListenPlainText'

export interface ScriptureAudioAutoScrollConfig {
  scopeRef: RefObject<HTMLElement | null>
  scrollContainerRef: RefObject<HTMLElement | null>
  /** When passage DOM may change without `audioUrls` changing (nav, verse/chapter, compare). */
  passageScopeKey?: string
}

export interface UseChapterStreamingAudioListenOptions {
  /** One or more `/api/scripture/audio` URLs; when length > 1, plays in order then stops. */
  audioUrls: string[]
  enabled: boolean
  onPlaybackError?: () => void
  /** Called when a playlist track starts (index 0 on Play, then each advance). */
  onTrackIndexChange?: (index: number) => void
  /** Playlist: index of the chapter currently shown in the reader (Play starts here; follows manual nav). */
  playlistStartIndex?: number
  /**
   * When the current track ends and there is no next URL in `audioUrls`, call this (e.g. modal
   * `onNext`) and auto-play after the URL updates. Not used for multi-track day playlists.
   */
  /** Return `false` when navigation did not run (e.g. no `hasNext`). */
  onAutoAdvanceAfterPlayback?: () => boolean | void
  /** Scroll the passage pane to keep approximate read position visible during playback. */
  autoScroll?: ScriptureAudioAutoScrollConfig
}

function audioSrcMatchesUrl(elementSrc: string, relativeUrl: string): boolean {
  try {
    const expected = new URL(relativeUrl, window.location.origin).href
    return elementSrc === expected || elementSrc.endsWith(relativeUrl)
  } catch {
    return elementSrc.includes(relativeUrl)
  }
}

export function useChapterStreamingAudioListen({
  audioUrls,
  enabled,
  onPlaybackError,
  onTrackIndexChange,
  playlistStartIndex = 0,
  onAutoAdvanceAfterPlayback,
  autoScroll,
}: UseChapterStreamingAudioListenOptions) {
  const [controlsOpen, setControlsOpen] = useState(false)
  const [listenPlaybackRate, setListenPlaybackRate] = useState<MemorizeListenSpeed>(() =>
    typeof window === 'undefined' ? 1 : readMemorizeListenSpeedFromStorage()
  )
  const [passageAudioPlaying, setPassageAudioPlaying] = useState(false)
  /** True while waiting for the next passage URL / `enabled` after auto-advance. */
  const [awaitingContinuousPlay, setAwaitingContinuousPlay] = useState(false)
  const [, bumpListenUi] = useState(0)
  const bumpListen = useCallback(() => bumpListenUi((n) => n + 1), [])

  const passageAudioRef = useRef<HTMLAudioElement | null>(null)
  const listenPlaybackRateRef = useRef(listenPlaybackRate)
  const onPlaybackErrorRef = useRef(onPlaybackError)
  const onTrackIndexChangeRef = useRef(onTrackIndexChange)
  const onAutoAdvanceAfterPlaybackRef = useRef(onAutoAdvanceAfterPlayback)
  const autoScrollRef = useRef(autoScroll)
  const autoScrollRafRef = useRef<number | null>(null)
  const autoScrollFrozenAtBottomRef = useRef(false)
  const autoScrollIntegratedTimeRef = useRef(0)
  const autoScrollLastFrameMsRef = useRef<number | null>(null)
  const autoScrollStartDelayRef = useRef<{ cacheKey: string; delaySec: number }>({
    cacheKey: '',
    delaySec: 0,
  })
  /** User started Play; keep advancing via `onAutoAdvanceAfterPlayback` until Pause/stop. */
  const continuousPlaybackRef = useRef(false)
  const autoPlayAfterNavRef = useRef(false)
  /** `audioUrlsKey` when auto-advance was scheduled; play only after the key changes. */
  const pendingAdvanceUrlsKeyRef = useRef<string | null>(null)
  const audioUrlsRef = useRef(audioUrls)
  const playlistIndexRef = useRef(playlistStartIndex)
  const playlistStartIndexRef = useRef(playlistStartIndex)

  useLayoutEffect(() => {
    listenPlaybackRateRef.current = listenPlaybackRate
    onPlaybackErrorRef.current = onPlaybackError
    onTrackIndexChangeRef.current = onTrackIndexChange
    onAutoAdvanceAfterPlaybackRef.current = onAutoAdvanceAfterPlayback
    audioUrlsRef.current = audioUrls
    playlistStartIndexRef.current = playlistStartIndex
    autoScrollRef.current = autoScroll
  }, [
    listenPlaybackRate,
    onPlaybackError,
    onTrackIndexChange,
    onAutoAdvanceAfterPlayback,
    audioUrls,
    playlistStartIndex,
    autoScroll,
  ])

  const isPlaylist = audioUrls.length > 1

  const audioUrlsKey = useMemo(() => audioUrls.join('\0'), [audioUrls])

  useEffect(() => {
    queueMicrotask(() => {
      setListenPlaybackRate(readMemorizeListenSpeedFromStorage())
    })
  }, [])

  useEffect(() => {
    const el = passageAudioRef.current
    if (!el) return
    applyMemorizeListenPlaybackRateToMediaElement(el, listenPlaybackRate)
    bumpListen()
  }, [bumpListen, listenPlaybackRate])

  const clearPendingContinuousPlay = useCallback(() => {
    autoPlayAfterNavRef.current = false
    pendingAdvanceUrlsKeyRef.current = null
    setAwaitingContinuousPlay(false)
  }, [])

  const schedulePendingContinuousPlay = useCallback(() => {
    autoPlayAfterNavRef.current = true
    pendingAdvanceUrlsKeyRef.current = audioUrlsKey
    setAwaitingContinuousPlay(true)
  }, [audioUrlsKey])

  const resetAutoScrollClock = useCallback((currentTimeSec = 0) => {
    autoScrollIntegratedTimeRef.current = currentTimeSec
    autoScrollLastFrameMsRef.current = null
  }, [])

  const invalidateAutoScrollTracking = useCallback(() => {
    autoScrollFrozenAtBottomRef.current = false
    autoScrollStartDelayRef.current = { cacheKey: '', delaySec: 0 }
    resetAutoScrollClock()
  }, [resetAutoScrollClock])

  const cancelAutoScrollLoop = useCallback(() => {
    if (autoScrollRafRef.current !== null) {
      cancelAnimationFrame(autoScrollRafRef.current)
      autoScrollRafRef.current = null
    }
  }, [])

  const syncAutoScrollFrame = useCallback(() => {
    const cfg = autoScrollRef.current
    const el = passageAudioRef.current
    if (!cfg || !el || el.paused) return

    const scrollContainer = cfg.scrollContainerRef.current
    if (!scrollContainer) return

    const duration = el.duration
    if (!Number.isFinite(duration) || duration <= 0) return

    const maxScrollTop = getScrollContainerMaxScrollTop(scrollContainer)
    if (maxScrollTop <= 0) return

    if (autoScrollFrozenAtBottomRef.current) return

    if (isScrollContainerAtBottom(scrollContainer)) {
      autoScrollFrozenAtBottomRef.current = true
      return
    }

    const nowMs =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now()
    const lastFrameMs = autoScrollLastFrameMsRef.current
    if (lastFrameMs === null) {
      autoScrollIntegratedTimeRef.current = el.currentTime
    } else {
      const deltaSec = Math.max(0, (nowMs - lastFrameMs) / 1000)
      autoScrollIntegratedTimeRef.current = advanceScriptureListenIntegratedPlaybackTime(
        autoScrollIntegratedTimeRef.current,
        el.currentTime,
        duration,
        el.playbackRate || 1,
        deltaSec
      )
    }
    autoScrollLastFrameMsRef.current = nowMs

    const scope = cfg.scopeRef.current
    const delayCacheKey = `${cfg.passageScopeKey ?? ''}|${duration}`
    if (
      scope &&
      autoScrollStartDelayRef.current.cacheKey !== delayCacheKey
    ) {
      autoScrollStartDelayRef.current = {
        cacheKey: delayCacheKey,
        delaySec: computeScriptureListenAutoScrollStartDelaySec(scope, duration),
      }
    }
    const startDelaySec = scope ? autoScrollStartDelayRef.current.delaySec : 0
    const fraction = scriptureListenPlaybackFractionForScroll(
      autoScrollIntegratedTimeRef.current,
      duration,
      startDelaySec
    )
    const targetScrollTop = computeScriptureListenProportionalScrollTop(scrollContainer, fraction)

    if (targetScrollTop >= maxScrollTop - SCRIPTURE_LISTEN_SCROLL_BOTTOM_EPSILON_PX) {
      autoScrollFrozenAtBottomRef.current = true
      applyScriptureListenContinuousScrollTop(scrollContainer, maxScrollTop)
      return
    }

    applyScriptureListenContinuousScrollTop(scrollContainer, targetScrollTop)
  }, [])

  const startAutoScrollLoop = useCallback(() => {
    cancelAutoScrollLoop()
    autoScrollFrozenAtBottomRef.current = false
    const el = passageAudioRef.current
    resetAutoScrollClock(el?.currentTime ?? 0)
    syncAutoScrollFrame()

    const tick = () => {
      const el = passageAudioRef.current
      if (!el || el.paused || !autoScrollRef.current) {
        autoScrollRafRef.current = null
        return
      }
      syncAutoScrollFrame()
      autoScrollRafRef.current = requestAnimationFrame(tick)
    }
    autoScrollRafRef.current = requestAnimationFrame(tick)
  }, [cancelAutoScrollLoop, resetAutoScrollClock, syncAutoScrollFrame])

  const stopAutoScrollLoop = useCallback(() => {
    cancelAutoScrollLoop()
    autoScrollFrozenAtBottomRef.current = false
    resetAutoScrollClock()
  }, [cancelAutoScrollLoop, resetAutoScrollClock])

  const stopAudio = useCallback(() => {
    const el = passageAudioRef.current
    if (el) {
      el.pause()
      el.removeAttribute('src')
      el.load()
    }
    playlistIndexRef.current = 0
    continuousPlaybackRef.current = false
    clearPendingContinuousPlay()
    setPassageAudioPlaying(false)
    stopAutoScrollLoop()
    bumpListen()
  }, [bumpListen, clearPendingContinuousPlay, stopAutoScrollLoop])

  useEffect(() => {
    if (!enabled) {
      if (!autoPlayAfterNavRef.current) {
        stopAudio()
        setControlsOpen(false)
      }
    }
  }, [enabled, stopAudio])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onExclusive = (ev: Event) => {
      const ce = ev as CustomEvent<GospelWebSpeechExclusiveOwnerDetail>
      if (!ce.detail) return
      switch (ce.detail.owner) {
        case 'profile-resource-read-aloud':
        case 'memorize-practice':
          stopAudio()
          setControlsOpen(false)
          break
        case 'scripture-chapter-audio':
          break
        default: {
          const _exhaustive: never = ce.detail.owner
          return _exhaustive
        }
      }
    }
    window.addEventListener(GOSPEL_WEB_SPEECH_EXCLUSIVE_OWNER_EVENT, onExclusive)
    return () => window.removeEventListener(GOSPEL_WEB_SPEECH_EXCLUSIVE_OWNER_EVENT, onExclusive)
  }, [stopAudio])

  const openControls = useCallback(() => setControlsOpen(true), [])
  const closeControls = useCallback(() => setControlsOpen(false), [])

  const onSelectSpeed = useCallback(
    (rate: MemorizeListenSpeed) => {
      setListenPlaybackRate(rate)
      writeMemorizeListenSpeedToStorage(rate)
      const el = passageAudioRef.current
      if (el) {
        applyMemorizeListenPlaybackRateToMediaElement(el, rate)
      }
      bumpListen()
    },
    [bumpListen]
  )

  const playUrlAtIndex = useCallback(
    async (index: number): Promise<boolean> => {
      const urls = audioUrlsRef.current
      if (index < 0 || index >= urls.length) return false
      const el = passageAudioRef.current
      if (!el) return false
      playlistIndexRef.current = index
      try {
        dispatchWebSpeechExclusiveOwner({ owner: 'scripture-chapter-audio' })
        el.src = urls[index]
        applyMemorizeListenPlaybackRateToMediaElement(el, listenPlaybackRateRef.current)
        await el.play()
        onTrackIndexChangeRef.current?.(index)
        setPassageAudioPlaying(true)
        bumpListen()
        return true
      } catch {
        setPassageAudioPlaying(false)
        bumpListen()
        return false
      }
    },
    [bumpListen]
  )

  const playNextInPlaylist = useCallback(
    async (fromIndex: number) => {
      const urls = audioUrlsRef.current
      for (let i = fromIndex; i < urls.length; i += 1) {
        const ok = await playUrlAtIndex(i)
        if (ok) return
      }
      onPlaybackErrorRef.current?.()
    },
    [playUrlAtIndex]
  )

  const tryPendingInFlightRef = useRef(false)

  const tryPendingContinuousPlay = useCallback(async () => {
    if (tryPendingInFlightRef.current) return false
    if (!autoPlayAfterNavRef.current || !enabled) return false
    if (pendingAdvanceUrlsKeyRef.current === audioUrlsKey) return false
    const urls = audioUrlsRef.current
    if (urls.length === 0) return false
    const startIdx = isPlaylist
      ? Math.min(Math.max(playlistStartIndexRef.current, 0), urls.length - 1)
      : 0
    playlistIndexRef.current = startIdx
    tryPendingInFlightRef.current = true
    try {
      const ok = await playUrlAtIndex(startIdx)
      if (ok) {
        clearPendingContinuousPlay()
      }
      return ok
    } finally {
      tryPendingInFlightRef.current = false
    }
  }, [audioUrlsKey, enabled, isPlaylist, playUrlAtIndex, clearPendingContinuousPlay])

  useEffect(() => {
    const urls = audioUrlsRef.current
    if (urls.length === 0) {
      if (!autoPlayAfterNavRef.current) {
        stopAudio()
      }
      return
    }
    const startIdx = isPlaylist
      ? Math.min(Math.max(playlistStartIndex, 0), urls.length - 1)
      : 0
    const el = passageAudioRef.current
    const hasSrc = Boolean(el?.getAttribute('src'))
    const isPlaying = Boolean(el && hasSrc && !el.paused && !el.ended)
    const expectedUrl = urls[startIdx]

    if (autoPlayAfterNavRef.current) {
      playlistIndexRef.current = startIdx
      if (enabled) {
        void tryPendingContinuousPlay()
      }
      return
    }

    if (isPlaying) {
      if (expectedUrl && hasSrc && audioSrcMatchesUrl(el!.src, expectedUrl)) {
        return
      }
      void playUrlAtIndex(startIdx)
      return
    }
    playlistIndexRef.current = startIdx
    stopAudio()
  }, [
    audioUrlsKey,
    playlistStartIndex,
    isPlaylist,
    audioUrls.length,
    playUrlAtIndex,
    stopAudio,
    enabled,
    tryPendingContinuousPlay,
  ])

  useLayoutEffect(() => {
    if (autoPlayAfterNavRef.current && enabled) {
      void tryPendingContinuousPlay()
    }
  }, [enabled, awaitingContinuousPlay, audioUrlsKey, tryPendingContinuousPlay])

  const handlePassageAudioPlay = useCallback(() => {
    setPassageAudioPlaying(true)
    invalidateAutoScrollTracking()
    startAutoScrollLoop()
  }, [invalidateAutoScrollTracking, startAutoScrollLoop])

  const handlePassageAudioPause = useCallback(() => {
    setPassageAudioPlaying(false)
    stopAutoScrollLoop()
    bumpListen()
  }, [bumpListen, stopAutoScrollLoop])

  const handlePassageAudioLoadedMetadata = useCallback(() => {
    invalidateAutoScrollTracking()
    const el = passageAudioRef.current
    if (el && !el.paused) {
      startAutoScrollLoop()
    }
  }, [invalidateAutoScrollTracking, startAutoScrollLoop])

  const handlePassageAudioEnded = useCallback(() => {
    const urls = audioUrlsRef.current
    if (urls.length > 1 && playlistIndexRef.current < urls.length - 1) {
      void playNextInPlaylist(playlistIndexRef.current + 1)
      return
    }
    const advance = onAutoAdvanceAfterPlaybackRef.current
    if (continuousPlaybackRef.current && advance) {
      const scheduled = advance() !== false
      if (scheduled) {
        schedulePendingContinuousPlay()
      } else {
        continuousPlaybackRef.current = false
        setPassageAudioPlaying(false)
        bumpListen()
      }
      return
    }
    setPassageAudioPlaying(false)
    bumpListen()
  }, [bumpListen, playNextInPlaylist, schedulePendingContinuousPlay])

  const handlePassageAudioError = useCallback(() => {
    const urls = audioUrlsRef.current
    if (urls.length > 1 && playlistIndexRef.current < urls.length - 1) {
      void playNextInPlaylist(playlistIndexRef.current + 1)
      return
    }
    setPassageAudioPlaying(false)
    bumpListen()
    onPlaybackErrorRef.current?.()
  }, [bumpListen, playNextInPlaylist])

  const listenButtonLabel = passageAudioPlaying ? 'Pause' : 'Listen'
  const listenAriaPressed = passageAudioPlaying

  const readAloudDialogPrimaryLabel = useMemo(
    () => (listenButtonLabel === 'Listen' ? 'Play' : listenButtonLabel),
    [listenButtonLabel]
  )

  const readAloudDialogPrimaryAriaLabel = useMemo(() => {
    if (listenButtonLabel === 'Pause') {
      return isPlaylist ? "Pause today's readings" : 'Pause chapter audio'
    }
    return isPlaylist ? "Play all of today's readings" : 'Play chapter audio'
  }, [isPlaylist, listenButtonLabel])

  const handlePrimaryClick = useCallback(() => {
    if (!enabled && !autoPlayAfterNavRef.current) {
      return
    }
    const el = passageAudioRef.current
    if (!el) return
    if (!el.paused && el.getAttribute('src')) {
      el.pause()
      continuousPlaybackRef.current = false
      clearPendingContinuousPlay()
      setPassageAudioPlaying(false)
      bumpListen()
      queueMicrotask(bumpListen)
      return
    }
    const urls = audioUrlsRef.current
    const startIdx = isPlaylist
      ? Math.min(Math.max(playlistStartIndexRef.current, 0), Math.max(urls.length - 1, 0))
      : 0
    const expectedUrl = urls[startIdx]
    if (
      el.paused &&
      el.getAttribute('src') &&
      expectedUrl &&
      audioSrcMatchesUrl(el.src, expectedUrl) &&
      playlistIndexRef.current === startIdx
    ) {
      void el.play().then(() => {
        if (onAutoAdvanceAfterPlaybackRef.current) {
          continuousPlaybackRef.current = true
        }
        setPassageAudioPlaying(true)
        bumpListen()
      })
      return
    }
    if (onAutoAdvanceAfterPlaybackRef.current) {
      continuousPlaybackRef.current = true
    }
    void playNextInPlaylist(startIdx)
  }, [bumpListen, clearPendingContinuousPlay, enabled, isPlaylist, playNextInPlaylist])

  const keepAudioMounted = enabled || awaitingContinuousPlay

  const passageScopeKey = autoScroll?.passageScopeKey

  useLayoutEffect(() => {
    if (!autoScroll) return
    invalidateAutoScrollTracking()
  }, [autoScroll, audioUrlsKey, passageScopeKey, invalidateAutoScrollTracking])

  useEffect(() => {
    return () => {
      cancelAutoScrollLoop()
    }
  }, [cancelAutoScrollLoop])

  return {
    passageAudioRef,
    keepAudioMounted,
    controlsOpen,
    openControls,
    closeControls,
    listenPlaybackRate,
    onSelectSpeed,
    handlePrimaryClick,
    readAloudDialogPrimaryLabel,
    readAloudDialogPrimaryAriaLabel,
    listenAriaPressed,
    stopAudio,
    handlePassageAudioPlay,
    handlePassageAudioPause,
    handlePassageAudioEnded,
    handlePassageAudioError,
    handlePassageAudioLoadedMetadata,
  }
}
