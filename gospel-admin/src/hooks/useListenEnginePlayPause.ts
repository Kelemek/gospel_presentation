'use client'

import { useCallback, useMemo, useRef, useState, useSyncExternalStore, type MutableRefObject } from 'react'
import { announceExclusiveListenOwner, type GospelExclusiveListenOwner } from '@/lib/gospelExclusiveListen'
import {
  getGospelListenSpeechEngine,
  getGospelListenSpeechEngineServerSnapshot,
  getGospelListenSpeechEngineSnapshot,
  isGospelListenSpeechAvailable,
  subscribeGospelListenSpeechEngine,
} from '@/lib/gospelListenSpeechEngine'
import type { MemorizeListenSpeed } from '@/lib/memorizeListenSpeedStorage'

export type UseListenEnginePlayPauseOptions = {
  listenPlaybackRateRef: MutableRefObject<MemorizeListenSpeed>
  exclusiveOwner: GospelExclusiveListenOwner
  idleLabel: string
  activeLabel: string
}

/** Shared play/pause/resume UI state for profile and memorize device TTS. */
export function useListenEnginePlayPause({
  listenPlaybackRateRef,
  exclusiveOwner,
  idleLabel,
  activeLabel,
}: UseListenEnginePlayPauseOptions) {
  const engineSnapshot = useSyncExternalStore(
    subscribeGospelListenSpeechEngine,
    getGospelListenSpeechEngineSnapshot,
    getGospelListenSpeechEngineServerSnapshot
  )

  const rateAtStartRef = useRef<MemorizeListenSpeed | null>(null)
  const [userPaused, setUserPaused] = useState(false)
  const [postResume, setPostResume] = useState(false)

  const resetPlaybackState = useCallback(() => {
    rateAtStartRef.current = null
    setUserPaused(false)
    setPostResume(false)
  }, [])

  const prepareUtteranceStart = useCallback((rate: MemorizeListenSpeed) => {
    setUserPaused(false)
    setPostResume(false)
    rateAtStartRef.current = rate
  }, [])

  const markUtteranceStarted = useCallback(() => {
    setPostResume(false)
  }, [])

  const handleSpeakingEngineClick = useCallback(
    (options: {
      restartCurrentUtterance: () => void
      onPause?: () => void
      /** Return true when click was handled (e.g. preempt foreign speech). */
      onSpeakingButNotOwned?: () => boolean
      beforeRestartOnRateChange?: () => void
    }): boolean => {
      const engine = getGospelListenSpeechEngine()
      if (!engine.isSpeaking()) return false

      if (options.onSpeakingButNotOwned?.()) return true

      if (engine.isPaused()) {
        setUserPaused(false)
        const atStart = rateAtStartRef.current
        if (atStart != null && listenPlaybackRateRef.current !== atStart) {
          options.beforeRestartOnRateChange?.()
          engine.cancel()
          rateAtStartRef.current = null
          setPostResume(false)
          options.restartCurrentUtterance()
        } else {
          setPostResume(true)
          announceExclusiveListenOwner(exclusiveOwner)
          engine.resume()
        }
      } else {
        setUserPaused(true)
        setPostResume(false)
        engine.pause()
        options.onPause?.()
      }
      return true
    },
    [exclusiveOwner, listenPlaybackRateRef]
  )

  const buttonLabel = useMemo(() => {
    void engineSnapshot.revision
    if (typeof window === 'undefined' || !isGospelListenSpeechAvailable()) return idleLabel
    if (userPaused) return idleLabel
    if (postResume && engineSnapshot.speaking) return activeLabel
    if (engineSnapshot.speaking && !engineSnapshot.paused) return activeLabel
    return idleLabel
  }, [
    activeLabel,
    engineSnapshot.paused,
    engineSnapshot.revision,
    engineSnapshot.speaking,
    idleLabel,
    postResume,
    userPaused,
  ])

  const ariaPressed = useMemo(() => {
    void engineSnapshot.revision
    if (typeof window === 'undefined' || !isGospelListenSpeechAvailable()) return false
    if (userPaused) return false
    if (postResume && engineSnapshot.speaking) return true
    return engineSnapshot.speaking && !engineSnapshot.paused
  }, [engineSnapshot.paused, engineSnapshot.revision, engineSnapshot.speaking, postResume, userPaused])

  return {
    rateAtStartRef,
    resetPlaybackState,
    prepareUtteranceStart,
    markUtteranceStarted,
    handleSpeakingEngineClick,
    buttonLabel,
    ariaPressed,
  }
}
