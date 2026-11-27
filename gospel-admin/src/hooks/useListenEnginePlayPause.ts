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
import type { ListenEnginePort } from '@/lib/profileListenPlaybackPort'

export type UseListenEnginePlayPauseOptions = {
  listenPlaybackRateRef: MutableRefObject<MemorizeListenSpeed>
  exclusiveOwner: GospelExclusiveListenOwner
  idleLabel: string
  activeLabel: string
  /** Profile Listen passes this so Grok audio drives play and pause. Memorize omits it. */
  port?: ListenEnginePort
}

/** Shared play/pause/resume UI state for profile and memorize device TTS. */
export function useListenEnginePlayPause({
  listenPlaybackRateRef,
  exclusiveOwner,
  idleLabel,
  activeLabel,
  port,
}: UseListenEnginePlayPauseOptions) {
  const engineSnapshot = useSyncExternalStore(
    port ? port.subscribe : subscribeGospelListenSpeechEngine,
    port ? port.getSnapshot : getGospelListenSpeechEngineSnapshot,
    port ? port.getServerSnapshot : getGospelListenSpeechEngineServerSnapshot
  )
  const speechAvailable = port ? port.isAvailable : isGospelListenSpeechAvailable
  const getEngine = port ? port.getEngine : getGospelListenSpeechEngine

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
      const engine = getEngine()
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
    [exclusiveOwner, getEngine, listenPlaybackRateRef]
  )

  const buttonLabel = useMemo(() => {
    void engineSnapshot.revision
    if (typeof window === 'undefined' || !speechAvailable()) return idleLabel
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
    speechAvailable,
    userPaused,
  ])

  const ariaPressed = useMemo(() => {
    void engineSnapshot.revision
    if (typeof window === 'undefined' || !speechAvailable()) return false
    if (userPaused) return false
    if (postResume && engineSnapshot.speaking) return true
    return engineSnapshot.speaking && !engineSnapshot.paused
  }, [engineSnapshot.paused, engineSnapshot.revision, engineSnapshot.speaking, postResume, speechAvailable, userPaused])

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
