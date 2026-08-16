'use client'

/* eslint-disable react-hooks/set-state-in-effect -- Verse/phase effects stop ESV + TTS playback on mount and when practice leaves intro. */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { claimExclusiveListenOwner } from '@/lib/gospelExclusiveListen'
import { useExclusiveListenPreemption } from '@/hooks/useExclusiveListenPreemption'
import { useMemorizePracticeTtsListen } from '@/hooks/useMemorizePracticeTtsListen'
import { isGospelListenSpeechAvailable } from '@/lib/gospelListenSpeechEngine'
import {
  applyMemorizeListenPlaybackRateToMediaElement,
  MEMORIZE_LISTEN_REPEAT_GAP_MS,
  readMemorizeListenSpeedFromStorage,
  writeMemorizeListenSpeedToStorage,
  type MemorizeListenSpeed,
} from '@/lib/memorizeListenSpeedStorage'
import type { MemorizedVerse } from '@/lib/verseMemorizationStorage'

export type UseMemorizePracticeListenOptions = {
  verse: MemorizedVerse
  verseId: string
  listenViaEsvPassageUrl: boolean
  memorizePassageAudioUrl: string
  listenInteractionAllowed: boolean
  /** When true, stops ESV + TTS (between rounds, complete, leaving intro). */
  shouldStopListen: boolean
}

export function useMemorizePracticeListen({
  verse,
  verseId,
  listenViaEsvPassageUrl,
  memorizePassageAudioUrl,
  listenInteractionAllowed,
  shouldStopListen,
}: UseMemorizePracticeListenOptions) {
  const passageAudioRef = useRef<HTMLAudioElement | null>(null)
  const [passageAudioPlaying, setPassageAudioPlaying] = useState(false)
  const [listenPanelOpen, setListenPanelOpen] = useState(false)
  const [listenPlaybackRate, setListenPlaybackRate] = useState<MemorizeListenSpeed>(() =>
    typeof window === 'undefined' ? 1 : readMemorizeListenSpeedFromStorage()
  )
  const listenPlaybackRateRef = useRef<MemorizeListenSpeed>(listenPlaybackRate)
  const [repeatListenOn, setRepeatListenOn] = useState(false)
  const repeatListenOnRef = useRef(false)
  const listenRepeatGapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearListenRepeatGapTimer = useCallback(() => {
    if (listenRepeatGapTimerRef.current != null) {
      clearTimeout(listenRepeatGapTimerRef.current)
      listenRepeatGapTimerRef.current = null
    }
  }, [])

  const {
    stopTts,
    handleTtsListenClick,
    ttsListenButtonLabel,
    ttsListenAriaPressed,
    startTtsRepeatIfIdle,
  } = useMemorizePracticeTtsListen({
    verse,
    clearListenRepeatGapTimer,
    listenRepeatGapTimerRef,
    repeatListenOnRef,
    listenPlaybackRateRef,
  })

  useLayoutEffect(() => {
    listenPlaybackRateRef.current = listenPlaybackRate
  }, [listenPlaybackRate])

  useLayoutEffect(() => {
    repeatListenOnRef.current = repeatListenOn
  }, [repeatListenOn])

  useEffect(() => {
    const el = passageAudioRef.current
    if (!el) return
    applyMemorizeListenPlaybackRateToMediaElement(el, listenPlaybackRate)
  }, [listenPlaybackRate])

  const stopPassageAudio = useCallback(() => {
    clearListenRepeatGapTimer()
    repeatListenOnRef.current = false
    setRepeatListenOn(false)
    stopTts()
    const el = passageAudioRef.current
    if (el) {
      try {
        el.pause()
        el.removeAttribute('src')
        el.load()
      } catch {
        /* jsdom HTMLMediaElement pause/load are not implemented */
      }
    }
    setPassageAudioPlaying(false)
  }, [clearListenRepeatGapTimer, stopTts])

  const stopMemorizeListenFromExternalSource = useCallback(() => {
    stopPassageAudio()
    setListenPanelOpen(false)
  }, [stopPassageAudio])

  useExclusiveListenPreemption(stopMemorizeListenFromExternalSource, 'memorize-practice')

  useEffect(() => {
    if (typeof window === 'undefined') return
    claimExclusiveListenOwner('memorize-practice')
    stopPassageAudio()
  }, [stopPassageAudio, verseId])

  useEffect(() => {
    if (shouldStopListen) {
      stopPassageAudio()
    }
  }, [shouldStopListen, stopPassageAudio])

  const listenButtonLabel = useMemo(() => {
    if (listenViaEsvPassageUrl) {
      return passageAudioPlaying ? 'Pause' : 'Listen'
    }
    if (typeof window === 'undefined' || !isGospelListenSpeechAvailable()) {
      return 'Listen'
    }
    return ttsListenButtonLabel
  }, [listenViaEsvPassageUrl, passageAudioPlaying, ttsListenButtonLabel])

  const listenAriaPressed = useMemo(() => {
    if (listenViaEsvPassageUrl) {
      return passageAudioPlaying
    }
    if (typeof window === 'undefined' || !isGospelListenSpeechAvailable()) {
      return false
    }
    return ttsListenAriaPressed
  }, [listenViaEsvPassageUrl, passageAudioPlaying, ttsListenAriaPressed])

  const readAloudDialogPrimaryLabel = useMemo(
    () => (listenButtonLabel === 'Listen' ? 'Play' : listenButtonLabel),
    [listenButtonLabel]
  )

  const readAloudDialogPrimaryAriaLabel = useMemo(() => {
    if (listenButtonLabel === 'Pause') {
      return 'Pause read-aloud of the passage'
    }
    if (listenViaEsvPassageUrl) {
      return 'Play the passage read aloud (ESV audio)'
    }
    return 'Play: read the memorized text aloud using the device (same translation is not available as streaming audio)'
  }, [listenButtonLabel, listenViaEsvPassageUrl])

  const handlePassageAudioPlay = useCallback(() => {
    const el = passageAudioRef.current
    if (el) {
      applyMemorizeListenPlaybackRateToMediaElement(el, listenPlaybackRateRef.current)
    }
    setPassageAudioPlaying(true)
  }, [])

  const handlePassageAudioPause = useCallback(() => {
    setPassageAudioPlaying(false)
  }, [])

  const handlePassageAudioError = useCallback(() => {
    setPassageAudioPlaying(false)
  }, [])

  const handlePassageAudioEnded = useCallback(() => {
    setPassageAudioPlaying(false)
    if (!repeatListenOnRef.current) {
      return
    }
    clearListenRepeatGapTimer()
    listenRepeatGapTimerRef.current = setTimeout(() => {
      listenRepeatGapTimerRef.current = null
      if (!repeatListenOnRef.current) {
        return
      }
      const el = passageAudioRef.current
      if (!el) {
        return
      }
      el.currentTime = 0
      applyMemorizeListenPlaybackRateToMediaElement(el, listenPlaybackRateRef.current)
      void el.play().catch(() => {
        setPassageAudioPlaying(false)
      })
    }, MEMORIZE_LISTEN_REPEAT_GAP_MS)
  }, [clearListenRepeatGapTimer])

  const handleListenPassageClick = useCallback(() => {
    if (!listenInteractionAllowed) {
      return
    }
    if (listenViaEsvPassageUrl) {
      const el = passageAudioRef.current
      if (!el) return
      if (!el.paused) {
        clearListenRepeatGapTimer()
        el.pause()
        setPassageAudioPlaying(false)
        return
      }
      void (async () => {
        try {
          claimExclusiveListenOwner('memorize-practice')
          el.src = memorizePassageAudioUrl
          applyMemorizeListenPlaybackRateToMediaElement(el, listenPlaybackRateRef.current)
          await el.play()
          setPassageAudioPlaying(true)
        } catch {
          setPassageAudioPlaying(false)
        }
      })()
      return
    }
    handleTtsListenClick()
  }, [
    clearListenRepeatGapTimer,
    handleTtsListenClick,
    listenInteractionAllowed,
    listenViaEsvPassageUrl,
    memorizePassageAudioUrl,
  ])

  const handleRepeatListenToggle = useCallback(() => {
    if (!listenInteractionAllowed) {
      return
    }
    const next = !repeatListenOnRef.current
    repeatListenOnRef.current = next
    setRepeatListenOn(next)
    if (next) {
      if (listenViaEsvPassageUrl) {
        const el = passageAudioRef.current
        if (el?.paused) {
          void (async () => {
            try {
              claimExclusiveListenOwner('memorize-practice')
              el.src = memorizePassageAudioUrl
              el.currentTime = 0
              applyMemorizeListenPlaybackRateToMediaElement(el, listenPlaybackRateRef.current)
              await el.play()
              setPassageAudioPlaying(true)
            } catch {
              setPassageAudioPlaying(false)
            }
          })()
        }
        return
      }
      startTtsRepeatIfIdle()
    } else {
      clearListenRepeatGapTimer()
    }
  }, [
    clearListenRepeatGapTimer,
    listenInteractionAllowed,
    listenViaEsvPassageUrl,
    memorizePassageAudioUrl,
    startTtsRepeatIfIdle,
  ])

  const onSelectSpeed = useCallback((rate: MemorizeListenSpeed) => {
    listenPlaybackRateRef.current = rate
    setListenPlaybackRate(rate)
    writeMemorizeListenSpeedToStorage(rate)
  }, [])

  const listenPanelVisible = listenPanelOpen && listenInteractionAllowed

  return {
    passageAudioRef,
    handlePassageAudioPlay,
    handlePassageAudioPause,
    handlePassageAudioEnded,
    handlePassageAudioError,
    listenPanelOpen,
    setListenPanelOpen,
    listenPanelVisible,
    listenPlaybackRate,
    onSelectSpeed,
    repeatListenOn,
    handleRepeatListenToggle,
    handleListenPassageClick,
    listenButtonLabel,
    listenAriaPressed,
    readAloudDialogPrimaryLabel,
    readAloudDialogPrimaryAriaLabel,
    stopPassageAudio,
  }
}
