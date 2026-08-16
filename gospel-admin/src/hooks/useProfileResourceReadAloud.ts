'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { GospelSection } from '@/lib/types'
import {
  readMemorizeListenSpeedFromStorage,
  writeMemorizeListenSpeedToStorage,
  type MemorizeListenSpeed,
} from '@/lib/memorizeListenSpeedStorage'
import { useExclusiveListenPreemption } from '@/hooks/useExclusiveListenPreemption'
import { getGospelListenSpeechEngine } from '@/lib/gospelListenSpeechEngine'
import { useProfileListenSession } from '@/hooks/useProfileListenSession'

export interface UseProfileResourceReadAloudOptions {
  sections: GospelSection[]
  /** Profile slug — enables saved resume position per TOC anchor in localStorage. */
  profileSlug?: string
  /** Optional alert when there is nothing to read or the anchor is missing */
  onNothingToRead?: (message: string) => void
}

export function useProfileResourceReadAloud({
  sections,
  profileSlug,
  onNothingToRead,
}: UseProfileResourceReadAloudOptions) {
  const [controlsOpen, setControlsOpen] = useState(false)
  const [listenPlaybackRate, setListenPlaybackRate] = useState<MemorizeListenSpeed>(() =>
    typeof window === 'undefined' ? 1 : readMemorizeListenSpeedFromStorage()
  )

  const listenPlaybackRateRef = useRef(listenPlaybackRate)

  const listenSession = useProfileListenSession({
    sections,
    profileSlug,
    onNothingToRead,
    listenPlaybackRateRef,
  })

  const {
    stopFromExternalSource,
    teardownReadAlong,
    handlePrimaryClick,
    listenButtonLabel,
    listenAriaPressed,
    restartCurrentChunkAtNewSpeed,
    restartReadAloudFromBeginning,
    startReadAloudFromHere,
    readAlongUnderlineOn,
    toggleReadAlongUnderline,
    readAlongUnderlineStyle,
    setReadAlongUnderlineStyle,
  } = listenSession

  const stopProfileReadAloudFromExternalSource = useCallback(() => {
    stopFromExternalSource()
    setControlsOpen(false)
  }, [stopFromExternalSource])

  useExclusiveListenPreemption(stopProfileReadAloudFromExternalSource, 'profile-resource-read-aloud')

  useEffect(() => {
    return () => {
      teardownReadAlong()
      getGospelListenSpeechEngine().cancel()
    }
  }, [teardownReadAlong])

  const readAloudDialogPrimaryLabel = listenButtonLabel
  const readAloudDialogPrimaryAriaLabel =
    listenButtonLabel === 'Pause'
      ? 'Pause read-aloud of the current section'
      : 'Play: read the current section aloud'

  const openControls = useCallback(() => setControlsOpen(true), [])
  const closeControls = useCallback(() => setControlsOpen(false), [])

  useLayoutEffect(() => {
    listenPlaybackRateRef.current = listenPlaybackRate
  }, [listenPlaybackRate])

  const onSelectSpeed = useCallback(
    (r: MemorizeListenSpeed) => {
      listenPlaybackRateRef.current = r
      setListenPlaybackRate(r)
      writeMemorizeListenSpeedToStorage(r)
      restartCurrentChunkAtNewSpeed()
    },
    [restartCurrentChunkAtNewSpeed]
  )

  return {
    controlsOpen,
    openControls,
    closeControls,
    listenPlaybackRate,
    onSelectSpeed,
    handlePrimaryClick,
    readAloudDialogPrimaryLabel,
    readAloudDialogPrimaryAriaLabel,
    listenAriaPressed,
    restartReadAloudFromBeginning,
    startReadAloudFromHere,
    readAlongUnderlineOn,
    toggleReadAlongUnderline,
    readAlongUnderlineStyle,
    setReadAlongUnderlineStyle,
  }
}
