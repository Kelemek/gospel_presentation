'use client'

import { useCallback, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import type { GospelSection } from '@/lib/types'
import { claimExclusiveListenOwner } from '@/lib/gospelExclusiveListen'
import {
  getGospelListenSpeechEngine,
  isGospelListenSpeechAvailable,
} from '@/lib/gospelListenSpeechEngine'
import { getGrokResourceListenPlayer } from '@/lib/grokResourceListenPlayer'
import {
  createProfileListenPlaybackPort,
  profileListenUsesGrok,
} from '@/lib/profileListenPlaybackPort'
import { useListenEnginePlayPause } from '@/hooks/useListenEnginePlayPause'
import { useProfileListenChunkQueue } from '@/hooks/useProfileListenChunkQueue'
import { useProfileReadAlongSession } from '@/hooks/useProfileReadAlongSession'
import { type MemorizeListenSpeed } from '@/lib/memorizeListenSpeedStorage'
import { getCurrentTocAnchorId } from '@/lib/tocAnchorFromScroll'
import { plainTextForProfileResourceListen } from '@/lib/profileResourceListenText'
import { findNextReadAlongScope } from '@/lib/profileReadAlongNextAnchor'
import {
  clearAllProfileReadAlongProgressForSlug,
  clearProfileReadAlongProgress,
  loadProfileReadAlongLastSession,
  loadProfileReadAlongProgress,
  readAlongTextFingerprint,
} from '@/lib/profileReadAlongProgressStorage'
import { readAlongListenScrollBehavior } from '@/lib/scrollReadAlongPlain'
import { plainOffsetAtViewportSentenceStart } from '@/lib/profileReadingPosition'
import { listenPlainAndChunksForScope } from '@/lib/profileListenChunkQueue'
import { DEVICE_LISTEN_VOICE_ID } from '@/lib/resourceListenVoiceStorage'
import {
  resolveProfileListenStartChunk,
  shouldResumeProfileListenFromLastSession,
} from '@/lib/profileListenChunkPlayback'

export type UseProfileListenSessionOptions = {
  sections: GospelSection[]
  profileSlug?: string
  onNothingToRead?: (message: string) => void
  listenPlaybackRateRef: MutableRefObject<MemorizeListenSpeed>
  resourceListenVoiceRef?: MutableRefObject<string>
  resourceListenVoiceId?: string
  onGrokFallback?: (message: string) => void
}

export function useProfileListenSession({
  sections,
  profileSlug,
  onNothingToRead,
  listenPlaybackRateRef,
  resourceListenVoiceRef,
  resourceListenVoiceId,
  onGrokFallback,
}: UseProfileListenSessionOptions) {
  const grokFallbackRef = useRef(false)
  const [grokFallback, setGrokFallback] = useState(false)
  const [trackedVoiceId, setTrackedVoiceId] = useState(resourceListenVoiceId)
  if (resourceListenVoiceId !== trackedVoiceId) {
    setTrackedVoiceId(resourceListenVoiceId)
    setGrokFallback(false)
  }
  useLayoutEffect(() => {
    grokFallbackRef.current = grokFallback
  }, [grokFallback])
  const usesGrok =
    !!resourceListenVoiceId &&
    resourceListenVoiceId !== DEVICE_LISTEN_VOICE_ID &&
    !grokFallback
  const playbackPort = useMemo(
    () => (resourceListenVoiceRef ? createProfileListenPlaybackPort(usesGrok) : undefined),
    [resourceListenVoiceRef, usesGrok]
  )
  const clearGrokFallback = useCallback(() => {
    grokFallbackRef.current = false
    setGrokFallback(false)
  }, [])
  const handleGrokFallback = useCallback(
    (message: string) => {
      grokFallbackRef.current = true
      setGrokFallback(true)
      onGrokFallback?.(message)
    },
    [onGrokFallback]
  )
  const readAlong = useProfileReadAlongSession({ profileSlug })

  const {
    profileSlugRef,
    persistTimerRef,
    listenTextOptionsRef,
    flushReadAlongProgressPersist,
    scheduleReadAlongUi,
    cancelReadAlongUiScheduling,
    teardownReadAlong,
    readAlongUnderlineOn,
    toggleReadAlongUnderline,
    readAlongUnderlineStyle,
    setReadAlongUnderlineStyle,
  } = readAlong

  const playPause = useListenEnginePlayPause({
    listenPlaybackRateRef,
    exclusiveOwner: 'profile-resource-read-aloud',
    idleLabel: 'Play',
    activeLabel: 'Pause',
    port: playbackPort,
  })
  const {
    rateAtStartRef,
    resetPlaybackState,
    prepareUtteranceStart,
    markUtteranceStarted,
    handleSpeakingEngineClick,
    buttonLabel: listenButtonLabel,
    ariaPressed: listenAriaPressed,
  } = playPause

  const chunkQueue = useProfileListenChunkQueue({
    sections,
    readAlong,
    listenPlaybackRateRef,
    rateAtStartRef,
    prepareUtteranceStart,
    markUtteranceStarted,
    resetPlaybackState,
    resourceListenVoiceRef,
    grokFallbackRef,
    onGrokFallback: handleGrokFallback,
  })

  const {
    beginChunkPlayback,
    bumpCancelGeneration,
    clearChunkQueue,
    restartCurrentChunkAtNewSpeed,
    speakChunkInternalRef,
    stopActiveSession,
    ttsActiveRef,
    ttsChunkIndexRef,
  } = chunkQueue

  const resolveListenScopeAndText = useCallback((): {
    scope: HTMLElement
    text: string
  } | null => {
    if (typeof window === 'undefined') return null
    const anchorId = getCurrentTocAnchorId(sections)
    if (!anchorId) {
      onNothingToRead?.('Could not determine which section is on screen.')
      return null
    }
    const el = document.getElementById(anchorId)
    if (!el) {
      onNothingToRead?.('Could not find this section on the page.')
      return null
    }
    const text = plainTextForProfileResourceListen(el, listenTextOptionsRef.current)
    if (!text) {
      onNothingToRead?.('There is no readable text in this section.')
      return null
    }
    return { scope: el, text }
  }, [sections, onNothingToRead, listenTextOptionsRef])

  const startReadAloudSession = useCallback(
    (
      fromBeginning: boolean,
      forcedResolved?: { scope: HTMLElement; text: string },
      forcedStartPlainOffset?: number
    ) => {
      const listenReady = playbackPort?.isAvailable() ?? isGospelListenSpeechAvailable()
      if (typeof window === 'undefined' || !listenReady) return

      const resolvedScroll = forcedResolved ?? resolveListenScopeAndText()
      if (!resolvedScroll) return

      let resolved = resolvedScroll
      const slug = profileSlugRef.current
      const useForcedStartOffset = forcedStartPlainOffset !== undefined

      if (!fromBeginning && !useForcedStartOffset && slug) {
        const scrollAnchorId = resolvedScroll.scope.id
        const textScroll = resolvedScroll.text
        const fpScroll = readAlongTextFingerprint(textScroll)
        const savedScroll = loadProfileReadAlongProgress(slug, scrollAnchorId)
        const hasScrollResume =
          savedScroll &&
          savedScroll.fingerprint === fpScroll &&
          savedScroll.plainOffset > 0 &&
          savedScroll.plainOffset < textScroll.length

        if (!hasScrollResume) {
          const last = loadProfileReadAlongLastSession(slug)
          if (last) {
            const el = document.getElementById(last.anchorId)
            if (el instanceof HTMLElement) {
              const text = plainTextForProfileResourceListen(el, listenTextOptionsRef.current)
              const resume = shouldResumeProfileListenFromLastSession({
                last,
                scrollAnchorId,
                lastAnchorText: text,
              })
              if (resume) {
                resolved = { scope: el, text }
                el.scrollIntoView({
                  block: 'center',
                  behavior: readAlongListenScrollBehavior(),
                })
              }
            }
          }
        }
      }

      const anchorId = resolved.scope.id
      const fingerprint = readAlongTextFingerprint(resolved.text)

      if (fromBeginning && slug) {
        clearProfileReadAlongProgress(slug, anchorId)
      }

      claimExclusiveListenOwner('profile-resource-read-aloud')
      cancelReadAlongUiScheduling()
      scheduleReadAlongUi({ highlight: null })
      bumpCancelGeneration()

      const chunkMeta = listenPlainAndChunksForScope(
        resolved.scope,
        listenTextOptionsRef.current,
        profileListenUsesGrok(resourceListenVoiceRef, grokFallbackRef) ? 'grok' : 'device'
      ).chunks
      if (chunkMeta.length === 0) return

      const { startChunk, startPlainOffset } = resolveProfileListenStartChunk({
        fromBeginning,
        forcedStartPlainOffset,
        plainTextLength: resolved.text.length,
        chunkMeta,
        fingerprint,
        savedProgress:
          !fromBeginning && forcedStartPlainOffset === undefined && slug
            ? loadProfileReadAlongProgress(slug, anchorId)
            : null,
      })

      beginChunkPlayback({
        scope: resolved.scope,
        anchorId,
        fingerprint,
        textLength: resolved.text.length,
        chunkMeta,
        startChunk,
        startPlainOffset,
      })
    },
    [
      beginChunkPlayback,
      bumpCancelGeneration,
      cancelReadAlongUiScheduling,
      listenTextOptionsRef,
      profileSlugRef,
      resolveListenScopeAndText,
      playbackPort,
      resourceListenVoiceRef,
      scheduleReadAlongUi,
    ]
  )

  const restartReadAloudFromBeginning = useCallback(() => {
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current)
      persistTimerRef.current = null
    }
    const slug = profileSlugRef.current
    if (slug && typeof document !== 'undefined') {
      clearAllProfileReadAlongProgressForSlug(slug, sections)
    }
    getGospelListenSpeechEngine().cancel()
    getGrokResourceListenPlayer().releaseAll()
    bumpCancelGeneration()
    cancelReadAlongUiScheduling()
    clearChunkQueue()

    const first =
      typeof document !== 'undefined'
        ? findNextReadAlongScope(sections, null, null, listenTextOptionsRef.current)
        : null
    if (!first) {
      onNothingToRead?.('There is no readable text in this profile.')
      return
    }
    first.scope.scrollIntoView({
      block: 'center',
      behavior: readAlongListenScrollBehavior(),
    })
    startReadAloudSession(true, { scope: first.scope, text: first.text })
  }, [
    bumpCancelGeneration,
    cancelReadAlongUiScheduling,
    clearChunkQueue,
    listenTextOptionsRef,
    onNothingToRead,
    persistTimerRef,
    profileSlugRef,
    sections,
    startReadAloudSession,
  ])

  const startReadAloudFromHere = useCallback(() => {
    const resolved = resolveListenScopeAndText()
    if (!resolved) return

    const chunkMeta = listenPlainAndChunksForScope(
      resolved.scope,
      listenTextOptionsRef.current,
      profileListenUsesGrok(resourceListenVoiceRef, grokFallbackRef) ? 'grok' : 'device'
    ).chunks
    if (chunkMeta.length === 0) return

    const offset = plainOffsetAtViewportSentenceStart(
      resolved.scope,
      chunkMeta,
      listenTextOptionsRef.current
    )
    startReadAloudSession(false, resolved, offset)
  }, [listenTextOptionsRef, resolveListenScopeAndText, resourceListenVoiceRef, startReadAloudSession])

  const handlePrimaryClick = useCallback(() => {
    const listenReady = playbackPort?.isAvailable() ?? isGospelListenSpeechAvailable()
    if (typeof window === 'undefined' || !listenReady) {
      onNothingToRead?.('Listen is not supported in this browser.')
      return
    }

    if (
      handleSpeakingEngineClick({
        restartCurrentUtterance: () => speakChunkInternalRef.current(ttsChunkIndexRef.current),
        onPause: flushReadAlongProgressPersist,
        beforeRestartOnRateChange: bumpCancelGeneration,
      })
    ) {
      return
    }

    if (!ttsActiveRef.current) {
      startReadAloudSession(false)
    }
  }, [
    bumpCancelGeneration,
    flushReadAlongProgressPersist,
    handleSpeakingEngineClick,
    onNothingToRead,
    playbackPort,
    speakChunkInternalRef,
    startReadAloudSession,
    ttsActiveRef,
    ttsChunkIndexRef,
  ])

  const stopFromExternalSource = useCallback(() => {
    stopActiveSession()
    flushReadAlongProgressPersist()
    clearChunkQueue()
    getGospelListenSpeechEngine().cancel()
    getGrokResourceListenPlayer().releaseAll()
  }, [clearChunkQueue, flushReadAlongProgressPersist, stopActiveSession])

  return {
    stopFromExternalSource,
    teardownReadAlong,
    handlePrimaryClick,
    listenButtonLabel,
    listenAriaPressed,
    restartCurrentChunkAtNewSpeed,
    clearGrokFallback,
    restartReadAloudFromBeginning,
    startReadAloudFromHere,
    readAlongUnderlineOn,
    toggleReadAlongUnderline,
    readAlongUnderlineStyle,
    setReadAlongUnderlineStyle,
  }
}
