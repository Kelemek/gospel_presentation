'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  applyMemorizeListenPlaybackRateToMediaElement,
  readMemorizeListenSpeedFromStorage,
  writeMemorizeListenSpeedToStorage,
  type MemorizeListenSpeed,
} from '@/lib/memorizeListenSpeedStorage'

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
  }, [
    listenPlaybackRate,
    onPlaybackError,
    onTrackIndexChange,
    onAutoAdvanceAfterPlayback,
    audioUrls,
    playlistStartIndex,
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

  const stopAudio = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
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
    bumpListen()
  }, [bumpListen, clearPendingContinuousPlay])

  useEffect(() => {
    if (!enabled) {
      if (!autoPlayAfterNavRef.current) {
        stopAudio()
        setControlsOpen(false)
      }
    }
  }, [enabled, stopAudio])

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
        if (typeof window !== 'undefined' && window.speechSynthesis?.speaking) {
          window.speechSynthesis.cancel()
        }
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
  }, [])

  const handlePassageAudioPause = useCallback(() => {
    setPassageAudioPlaying(false)
    bumpListen()
  }, [bumpListen])

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
  }
}
