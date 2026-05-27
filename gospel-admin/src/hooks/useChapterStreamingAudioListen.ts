'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
}: UseChapterStreamingAudioListenOptions) {
  const [controlsOpen, setControlsOpen] = useState(false)
  const [listenPlaybackRate, setListenPlaybackRate] = useState<MemorizeListenSpeed>(() =>
    typeof window === 'undefined' ? 1 : readMemorizeListenSpeedFromStorage()
  )
  const [passageAudioPlaying, setPassageAudioPlaying] = useState(false)
  const [listenUiTick, setListenUiTick] = useState(0)
  const bumpListen = useCallback(() => setListenUiTick((n) => n + 1), [])

  const passageAudioRef = useRef<HTMLAudioElement | null>(null)
  const listenPlaybackRateRef = useRef(listenPlaybackRate)
  listenPlaybackRateRef.current = listenPlaybackRate

  const onPlaybackErrorRef = useRef(onPlaybackError)
  onPlaybackErrorRef.current = onPlaybackError

  const onTrackIndexChangeRef = useRef(onTrackIndexChange)
  onTrackIndexChangeRef.current = onTrackIndexChange

  const audioUrlsRef = useRef(audioUrls)
  audioUrlsRef.current = audioUrls

  const playlistIndexRef = useRef(playlistStartIndex)
  const playlistStartIndexRef = useRef(playlistStartIndex)
  playlistStartIndexRef.current = playlistStartIndex

  const isPlaylist = audioUrls.length > 1

  const audioUrlsKey = useMemo(() => audioUrls.join('\0'), [audioUrls])

  useEffect(() => {
    setListenPlaybackRate(readMemorizeListenSpeedFromStorage())
  }, [])

  useEffect(() => {
    const el = passageAudioRef.current
    if (!el) return
    applyMemorizeListenPlaybackRateToMediaElement(el, listenPlaybackRate)
    bumpListen()
  }, [bumpListen, listenPlaybackRate])

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
    setPassageAudioPlaying(false)
    bumpListen()
  }, [bumpListen])

  useEffect(() => {
    if (!enabled) {
      stopAudio()
      setControlsOpen(false)
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

  useEffect(() => {
    const urls = audioUrlsRef.current
    if (urls.length === 0) {
      stopAudio()
      return
    }
    const startIdx = isPlaylist
      ? Math.min(Math.max(playlistStartIndex, 0), urls.length - 1)
      : 0
    const el = passageAudioRef.current
    const hasSrc = Boolean(el?.getAttribute('src'))
    const isPlaying = Boolean(el && hasSrc && !el.paused && !el.ended)
    const expectedUrl = urls[startIdx]

    if (isPlaying) {
      if (expectedUrl && hasSrc && audioSrcMatchesUrl(el!.src, expectedUrl)) {
        return
      }
      void playUrlAtIndex(startIdx)
      return
    }
    playlistIndexRef.current = startIdx
    stopAudio()
  }, [audioUrlsKey, playlistStartIndex, isPlaylist, audioUrls.length, playUrlAtIndex, stopAudio])

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
    setPassageAudioPlaying(false)
    bumpListen()
  }, [bumpListen, playNextInPlaylist])

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

  const listenButtonLabel = useMemo(() => {
    void listenUiTick
    const el = passageAudioRef.current
    if (el?.getAttribute('src')) {
      return !el.paused && !el.ended ? 'Pause' : 'Listen'
    }
    return passageAudioPlaying ? 'Pause' : 'Listen'
  }, [listenUiTick, passageAudioPlaying])

  const listenAriaPressed = useMemo(() => {
    void listenUiTick
    const el = passageAudioRef.current
    if (el?.getAttribute('src')) {
      return !el.paused && !el.ended
    }
    return passageAudioPlaying
  }, [listenUiTick, passageAudioPlaying])

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
    if (!enabled) {
      return
    }
    const el = passageAudioRef.current
    if (!el) return
    if (!el.paused && el.getAttribute('src')) {
      el.pause()
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
        setPassageAudioPlaying(true)
        bumpListen()
      })
      return
    }
    void playNextInPlaylist(startIdx)
  }, [bumpListen, enabled, isPlaylist, playNextInPlaylist])

  return {
    passageAudioRef,
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
