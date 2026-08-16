'use client'

import { useCallback, useRef } from 'react'
import { claimExclusiveListenOwner } from '@/lib/gospelExclusiveListen'
import {
  getGospelListenSpeechEngine,
  isGospelListenSpeechAvailable,
} from '@/lib/gospelListenSpeechEngine'
import { useListenEnginePlayPause } from '@/hooks/useListenEnginePlayPause'
import { getMemorizationListenUtteranceText } from '@/lib/memorizationListenUtteranceText'
import {
  MEMORIZE_LISTEN_REPEAT_GAP_MS,
  toMemorizeWebSpeechUtteranceRate,
  type MemorizeListenSpeed,
} from '@/lib/memorizeListenSpeedStorage'
import { isMemorizeIosWebHost } from '@/lib/memorizationViewportPlatform'
import type { MemorizedVerse } from '@/lib/verseMemorizationStorage'

export type UseMemorizePracticeTtsListenOptions = {
  verse: MemorizedVerse
  clearListenRepeatGapTimer: () => void
  listenRepeatGapTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
  repeatListenOnRef: React.MutableRefObject<boolean>
  listenPlaybackRateRef: React.MutableRefObject<MemorizeListenSpeed>
}

export function useMemorizePracticeTtsListen({
  verse,
  clearListenRepeatGapTimer,
  listenRepeatGapTimerRef,
  repeatListenOnRef,
  listenPlaybackRateRef,
}: UseMemorizePracticeTtsListenOptions) {
  const memorizeTtsSessionActiveRef = useRef(false)

  const playPause = useListenEnginePlayPause({
    listenPlaybackRateRef,
    exclusiveOwner: 'memorize-practice',
    idleLabel: 'Listen',
    activeLabel: 'Pause',
  })
  const {
    resetPlaybackState,
    prepareUtteranceStart,
    markUtteranceStarted,
    handleSpeakingEngineClick,
    buttonLabel,
    ariaPressed,
  } = playPause

  const stopTts = useCallback(() => {
    getGospelListenSpeechEngine().cancel()
    resetPlaybackState()
    memorizeTtsSessionActiveRef.current = false
  }, [resetPlaybackState])

  const beginTtsUtterance = useCallback(
    function speakTtsLine() {
      if (!isGospelListenSpeechAvailable()) return
      const text = getMemorizationListenUtteranceText(verse)
      if (!text.trim()) return

      claimExclusiveListenOwner('memorize-practice')
      memorizeTtsSessionActiveRef.current = false

      const rate = listenPlaybackRateRef.current
      const utteranceRate = toMemorizeWebSpeechUtteranceRate(rate, isMemorizeIosWebHost())
      prepareUtteranceStart(rate)

      getGospelListenSpeechEngine().speak(text, utteranceRate, {
        onstart: () => {
          memorizeTtsSessionActiveRef.current = true
          markUtteranceStarted()
        },
        onend: () => {
          memorizeTtsSessionActiveRef.current = false
          resetPlaybackState()
          if (!repeatListenOnRef.current) return
          clearListenRepeatGapTimer()
          listenRepeatGapTimerRef.current = setTimeout(() => {
            listenRepeatGapTimerRef.current = null
            if (!repeatListenOnRef.current) return
            speakTtsLine()
          }, MEMORIZE_LISTEN_REPEAT_GAP_MS)
        },
        onerror: () => {
          memorizeTtsSessionActiveRef.current = false
          resetPlaybackState()
        },
      })
    },
    [
      clearListenRepeatGapTimer,
      listenPlaybackRateRef,
      listenRepeatGapTimerRef,
      markUtteranceStarted,
      prepareUtteranceStart,
      repeatListenOnRef,
      resetPlaybackState,
      verse,
    ]
  )

  const handleTtsListenClick = useCallback(() => {
    if (!isGospelListenSpeechAvailable()) return

    if (
      handleSpeakingEngineClick({
        restartCurrentUtterance: beginTtsUtterance,
        onSpeakingButNotOwned: () => {
          if (memorizeTtsSessionActiveRef.current) return false
          resetPlaybackState()
          getGospelListenSpeechEngine().cancel()
          beginTtsUtterance()
          return true
        },
      })
    ) {
      return
    }
    beginTtsUtterance()
  }, [beginTtsUtterance, handleSpeakingEngineClick, resetPlaybackState])

  const startTtsRepeatIfIdle = useCallback(() => {
    if (!isGospelListenSpeechAvailable()) return
    const engine = getGospelListenSpeechEngine()
    if (!engine.isSpeaking()) {
      beginTtsUtterance()
    } else if (!memorizeTtsSessionActiveRef.current) {
      engine.cancel()
      beginTtsUtterance()
    }
  }, [beginTtsUtterance])

  return {
    isTtsListenAvailable: isGospelListenSpeechAvailable(),
    stopTts,
    beginTtsUtterance,
    handleTtsListenClick,
    ttsListenButtonLabel: buttonLabel,
    ttsListenAriaPressed: ariaPressed,
    startTtsRepeatIfIdle,
  }
}
