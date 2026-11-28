'use client'

import { useCallback, useLayoutEffect, useRef, type MutableRefObject } from 'react'
import type { GospelSection } from '@/lib/types'
import {
  getGospelListenSpeechEngine,
  isGospelListenSpeechAvailable,
  type GospelListenSpeechHandlers,
} from '@/lib/gospelListenSpeechEngine'
import {
  toMemorizeWebSpeechUtteranceRate,
  type MemorizeListenSpeed,
} from '@/lib/memorizeListenSpeedStorage'
import { isMemorizeIosWebHost } from '@/lib/memorizationViewportPlatform'
import { findNextReadAlongScope } from '@/lib/profileReadAlongNextAnchor'
import {
  clearProfileReadAlongProgress,
  saveProfileReadAlongLastSession,
} from '@/lib/profileReadAlongProgressStorage'
import {
  prefersReducedMotionReadAlong,
  scrollListenScopeIntoViewCenter,
} from '@/lib/scrollReadAlongPlain'
import {
  buildProfileListenChunkQueueLayers,
  listenPlainAndChunksForScope,
  type ProfileListenChunkQueueLayers,
} from '@/lib/profileListenChunkQueue'
import {
  computeProfileListenInterChunkGapMs,
  resolveProfileListenChunkSpeakPayload,
  resolveProfileListenQueueCompletion,
} from '@/lib/profileListenChunkPlayback'
import {
  readAlongProgressPlainOnBoundary,
  readAlongProgressPlainOnChunkStart,
  readAlongUiOnBoundary,
  readAlongUiOnChunkStart,
} from '@/lib/profileListenReadAlongUi'
import { getReadAlongBoundaryUiLagMs } from '@/lib/readAlongBoundaryUiLag'
import { addPresentationReadCompleteSlug } from '@/lib/presentationReadCompleteStorage'
import {
  GROK_LISTEN_FALLBACK_NOTE,
  shouldFallbackGrokListenToDevice,
} from '@/lib/grokListenFallback'
import { getGrokResourceListenPlayer, GROK_LISTEN_PREFETCH_AHEAD } from '@/lib/grokResourceListenPlayer'
import { profileListenUsesGrok } from '@/lib/profileListenPlaybackPort'
import type { useProfileReadAlongSession } from '@/hooks/useProfileReadAlongSession'

type ProfileReadAlongChunkQueueBindings = Pick<
  ReturnType<typeof useProfileReadAlongSession>,
  | 'profileSlugRef'
  | 'readAlongScopeRef'
  | 'readAlongPlainLenRef'
  | 'readAlongAnchorIdRef'
  | 'readAlongFingerprintRef'
  | 'lastPersistedPlainOffsetRef'
  | 'persistTimerRef'
  | 'readAlongUnderlineEnabledRef'
  | 'readAlongUnderlineStyleRef'
  | 'readAlongBoundaryLagSeqRef'
  | 'listenTextOptionsRef'
  | 'recordReadAlongProgressPlainOffset'
  | 'scheduleReadAlongUi'
  | 'clearReadAlongSession'
>

export type UseProfileListenChunkQueueOptions = {
  sections: GospelSection[]
  readAlong: ProfileReadAlongChunkQueueBindings
  listenPlaybackRateRef: MutableRefObject<MemorizeListenSpeed>
  rateAtStartRef: MutableRefObject<MemorizeListenSpeed | null>
  prepareUtteranceStart: (rate: MemorizeListenSpeed) => void
  markUtteranceStarted: () => void
  resetPlaybackState: () => void
  resourceListenVoiceRef?: MutableRefObject<string>
  grokFallbackRef?: MutableRefObject<boolean>
  onGrokFallback?: (message: string) => void
}

export function useProfileListenChunkQueue({
  sections,
  readAlong,
  listenPlaybackRateRef,
  rateAtStartRef,
  prepareUtteranceStart,
  markUtteranceStarted,
  resetPlaybackState,
  resourceListenVoiceRef,
  grokFallbackRef,
  onGrokFallback,
}: UseProfileListenChunkQueueOptions) {
  const deviceVoiceRef = useRef('device')
  const voiceRef = resourceListenVoiceRef ?? deviceVoiceRef
  const internalFallbackRef = useRef(false)
  const fallbackRef = grokFallbackRef ?? internalFallbackRef
  const grokFallbackNotedRef = useRef(false)
  const {
    profileSlugRef,
    readAlongScopeRef,
    readAlongPlainLenRef,
    readAlongAnchorIdRef,
    readAlongFingerprintRef,
    lastPersistedPlainOffsetRef,
    persistTimerRef,
    readAlongUnderlineEnabledRef,
    readAlongUnderlineStyleRef,
    readAlongBoundaryLagSeqRef,
    listenTextOptionsRef,
    recordReadAlongProgressPlainOffset,
    scheduleReadAlongUi,
    clearReadAlongSession,
  } = readAlong

  const speakChunkInternalRef = useRef<(chunkIndex: number) => void>(() => {})

  const ttsChunksRef = useRef<string[]>([])
  const ttsChunksSpeakRef = useRef<string[]>([])
  const ttsChunkSpeakCharToDisplayCharRef = useRef<number[][]>([])
  const ttsChunkPlainStartsRef = useRef<number[]>([])
  const ttsPauseBeforeChunkRef = useRef<boolean[]>([])
  const ttsChunkIndexRef = useRef(0)
  const ttsActiveRef = useRef(false)
  const ttsCancelGenerationRef = useRef(0)

  const getChunkQueueLayers = useCallback(
    (): ProfileListenChunkQueueLayers => ({
      displayChunks: ttsChunksRef.current,
      speakChunks: ttsChunksSpeakRef.current,
      speakCharToDisplayChar: ttsChunkSpeakCharToDisplayCharRef.current,
      plainStarts: ttsChunkPlainStartsRef.current,
      pauseBeforeChunk: ttsPauseBeforeChunkRef.current,
    }),
    []
  )

  const recordReadAlongProgress = useCallback(
    (plainOffset: number) => {
      recordReadAlongProgressPlainOffset(plainOffset, ttsActiveRef.current)
    },
    [recordReadAlongProgressPlainOffset]
  )

  const applyChunkQueueLayers = useCallback(
    (
      scope: HTMLElement,
      anchorId: string,
      fingerprint: string,
      textLength: number,
      layers: ReturnType<typeof buildProfileListenChunkQueueLayers>
    ) => {
      readAlongAnchorIdRef.current = anchorId
      readAlongFingerprintRef.current = fingerprint
      readAlongScopeRef.current = scope
      readAlongPlainLenRef.current = textLength
      ttsChunkPlainStartsRef.current = layers.plainStarts
      ttsPauseBeforeChunkRef.current = layers.pauseBeforeChunk
      ttsChunksRef.current = layers.displayChunks
      ttsChunksSpeakRef.current = layers.speakChunks
      ttsChunkSpeakCharToDisplayCharRef.current = layers.speakCharToDisplayChar
    },
    [
      readAlongAnchorIdRef,
      readAlongFingerprintRef,
      readAlongPlainLenRef,
      readAlongScopeRef,
    ]
  )

  const clearChunkQueue = useCallback(() => {
    ttsChunkPlainStartsRef.current = []
    ttsPauseBeforeChunkRef.current = []
    ttsChunksRef.current = []
    ttsChunksSpeakRef.current = []
    ttsChunkSpeakCharToDisplayCharRef.current = []
    clearReadAlongSession()
  }, [clearReadAlongSession])

  const stopActiveSession = useCallback(() => {
    ttsCancelGenerationRef.current += 1
    ttsActiveRef.current = false
    ttsChunkIndexRef.current = 0
    resetPlaybackState()
    getGrokResourceListenPlayer().releaseAll()
  }, [resetPlaybackState])

  const speakChunkInternal = useCallback(
    (chunkIndex: number) => {
      const useGrok = profileListenUsesGrok(voiceRef, fallbackRef)
      if (typeof window === 'undefined') return
      if (!useGrok && !isGospelListenSpeechAvailable()) return

      const deviceEngine = getGospelListenSpeechEngine()
      const grokPlayer = getGrokResourceListenPlayer()
      const chunks = ttsChunksRef.current
      if (chunkIndex >= chunks.length) {
        const slug = profileSlugRef.current
        const anchorDone = readAlongAnchorIdRef.current
        const completedScope = readAlongScopeRef.current
        if (persistTimerRef.current) {
          clearTimeout(persistTimerRef.current)
          persistTimerRef.current = null
        }
        rateAtStartRef.current = null
        clearChunkQueue()
        if (slug && anchorDone) clearProfileReadAlongProgress(slug, anchorDone)

        const next =
          anchorDone && typeof document !== 'undefined'
            ? findNextReadAlongScope(sections, completedScope, anchorDone, listenTextOptionsRef.current)
            : null

        const nextScope =
          next && typeof document !== 'undefined'
            ? (() => {
                const { chunks: chunkMeta } = listenPlainAndChunksForScope(
                  next.scope,
                  listenTextOptionsRef.current,
                  useGrok ? 'grok' : 'device'
                )
                return {
                  anchorId: next.anchorId,
                  text: next.text,
                  chunkMeta,
                  scope: next.scope,
                }
              })()
            : null

        const completion = resolveProfileListenQueueCompletion({
          profileSlug: slug,
          anchorDone,
          nextScope: nextScope
            ? {
                anchorId: nextScope.anchorId,
                text: nextScope.text,
                chunkMeta: nextScope.chunkMeta,
              }
            : null,
        })

        if (completion.kind === 'advance' && nextScope) {
          lastPersistedPlainOffsetRef.current = 0
          applyChunkQueueLayers(
            nextScope.scope,
            completion.target.anchorId,
            completion.target.fingerprint,
            completion.target.text.length,
            completion.target.layers
          )
          ttsActiveRef.current = true
          if (slug) {
            saveProfileReadAlongLastSession(
              slug,
              completion.target.anchorId,
              0,
              completion.target.fingerprint
            )
          }
          scrollListenScopeIntoViewCenter(nextScope.scope)
          speakChunkInternalRef.current(0)
          return
        }

        if (completion.kind === 'markReadComplete') {
          addPresentationReadCompleteSlug(completion.profileSlug)
        }

        ttsActiveRef.current = false
        ttsChunkIndexRef.current = 0
        return
      }

      const layers = getChunkQueueLayers()
      const payload = resolveProfileListenChunkSpeakPayload(layers, chunkIndex)
      if (!payload) {
        speakChunkInternalRef.current(chunkIndex + 1)
        return
      }
      const { displayChunk, speakChunk, speakMap } = payload

      ttsChunkIndexRef.current = chunkIndex
      const birthGen = ttsCancelGenerationRef.current

      const rate = listenPlaybackRateRef.current
      const utteranceRate = toMemorizeWebSpeechUtteranceRate(rate, isMemorizeIosWebHost())
      prepareUtteranceStart(rate)

      let fellBack = false
      const speakingEngine = () => (fellBack || !useGrok ? deviceEngine : grokPlayer)
      const handlers: GospelListenSpeechHandlers = {
        onstart: () => {
          markUtteranceStarted()
          const scope = readAlongScopeRef.current
          const plainLen = readAlongPlainLenRef.current
          const chunkStart = ttsChunkPlainStartsRef.current[chunkIndex] ?? 0
          recordReadAlongProgress(chunkStart)
          if (!scope || plainLen <= 0) return

          const reducedMotion = prefersReducedMotionReadAlong()
          recordReadAlongProgress(
            readAlongProgressPlainOnChunkStart({
              chunkStart,
              displayChunk,
              speakChunk,
              speakMap,
              plainLen,
            })
          )
          scheduleReadAlongUi(
            readAlongUiOnChunkStart({
              chunkStart,
              displayChunk,
              speakChunk,
              speakMap,
              plainLen,
              underlineEnabled: readAlongUnderlineEnabledRef.current,
              underlineStyle: readAlongUnderlineStyleRef.current,
              reducedMotion,
            })
          )
        },
        onboundary: (ev) => {
          if (birthGen !== ttsCancelGenerationRef.current) return
          if (speakingEngine().isPaused()) return
          const scope = readAlongScopeRef.current
          const plainLen = readAlongPlainLenRef.current
          if (!scope || plainLen <= 0) return
          const chunkStart = ttsChunkPlainStartsRef.current[chunkIndex] ?? 0
          const reducedMotion = prefersReducedMotionReadAlong()
          const lagMs = reducedMotion ? 0 : getReadAlongBoundaryUiLagMs()

          const applyBoundaryUi = () => {
            if (birthGen !== ttsCancelGenerationRef.current) return
            if (!ttsActiveRef.current) return
            if (speakingEngine().isPaused()) return
            if (ttsChunkIndexRef.current !== chunkIndex) return

            recordReadAlongProgress(
              readAlongProgressPlainOnBoundary({
                chunkStart,
                displayChunk,
                speakChunk,
                speakMap,
                plainLen,
                boundary: ev,
              })
            )
            scheduleReadAlongUi(
              readAlongUiOnBoundary({
                chunkStart,
                displayChunk,
                speakChunk,
                speakMap,
                plainLen,
                underlineEnabled: readAlongUnderlineEnabledRef.current,
                underlineStyle: readAlongUnderlineStyleRef.current,
                reducedMotion,
                boundary: ev,
              })
            )
          }

          if (lagMs <= 0) {
            applyBoundaryUi()
            return
          }

          readAlongBoundaryLagSeqRef.current += 1
          const seq = readAlongBoundaryLagSeqRef.current
          window.setTimeout(() => {
            if (seq !== readAlongBoundaryLagSeqRef.current) return
            applyBoundaryUi()
          }, lagMs)
        },
        onend: () => {
          if (birthGen !== ttsCancelGenerationRef.current) return
          rateAtStartRef.current = null
          const nextIndex = chunkIndex + 1
          const runNext = () => {
            if (birthGen !== ttsCancelGenerationRef.current) return
            speakChunkInternalRef.current(nextIndex)
          }
          const gapMs = computeProfileListenInterChunkGapMs(
            displayChunk,
            nextIndex,
            chunks.length,
            ttsPauseBeforeChunkRef.current,
            { grok: useGrok && !fellBack }
          )
          if (gapMs > 0 && typeof window !== 'undefined') {
            window.setTimeout(runNext, gapMs)
          } else {
            runNext()
          }
        },
        onerror: () => {
          if (birthGen !== ttsCancelGenerationRef.current) return
          if (
            !fellBack &&
            useGrok &&
            shouldFallbackGrokListenToDevice(
              grokPlayer.consumeFailure(),
              isGospelListenSpeechAvailable()
            )
          ) {
            fellBack = true
            fallbackRef.current = true
            if (!grokFallbackNotedRef.current) {
              grokFallbackNotedRef.current = true
              onGrokFallback?.(GROK_LISTEN_FALLBACK_NOTE)
            }
            grokPlayer.releaseAll()
            deviceEngine.speak(speakChunk, utteranceRate, handlers)
            return
          }
          ttsActiveRef.current = false
          ttsChunkIndexRef.current = 0
          rateAtStartRef.current = null
          clearChunkQueue()
          grokPlayer.releaseAll()
        },
      }

      if (useGrok) {
        grokPlayer.configure({
          voiceId: voiceRef.current,
          withTimestamps: readAlongUnderlineEnabledRef.current,
        })
        const ahead: string[] = []
        for (let j = 1; j <= GROK_LISTEN_PREFETCH_AHEAD; j++) {
          const text = ttsChunksSpeakRef.current[chunkIndex + j]
          if (text) ahead.push(text)
        }
        grokPlayer.prefetchAhead(ahead)
        grokPlayer.speak(speakChunk, rate, handlers)
        return
      }

      deviceEngine.speak(speakChunk, utteranceRate, handlers)
    },
    [
      applyChunkQueueLayers,
      clearChunkQueue,
      getChunkQueueLayers,
      listenPlaybackRateRef,
      prepareUtteranceStart,
      markUtteranceStarted,
      rateAtStartRef,
      profileSlugRef,
      readAlongAnchorIdRef,
      readAlongBoundaryLagSeqRef,
      readAlongPlainLenRef,
      readAlongScopeRef,
      readAlongUnderlineEnabledRef,
      readAlongUnderlineStyleRef,
      lastPersistedPlainOffsetRef,
      listenTextOptionsRef,
      persistTimerRef,
      recordReadAlongProgress,
      scheduleReadAlongUi,
      onGrokFallback,
      sections,
      voiceRef,
      fallbackRef,
    ]
  )

  useLayoutEffect(() => {
    speakChunkInternalRef.current = speakChunkInternal
  }, [speakChunkInternal])

  const restartCurrentChunkAtNewSpeed = useCallback(() => {
    if (!ttsActiveRef.current) return
    const grokPlayer = getGrokResourceListenPlayer()
    const deviceEngine = getGospelListenSpeechEngine()
    const speaking = grokPlayer.isSpeaking() || deviceEngine.isSpeaking()
    const paused =
      (grokPlayer.isSpeaking() && grokPlayer.isPaused()) ||
      (deviceEngine.isSpeaking() && deviceEngine.isPaused())
    if (!speaking || paused) return
    const i = ttsChunkIndexRef.current
    ttsCancelGenerationRef.current += 1
    grokPlayer.cancel()
    deviceEngine.cancel()
    resetPlaybackState()
    queueMicrotask(() => speakChunkInternalRef.current(i))
  }, [resetPlaybackState])

  const beginChunkPlayback = useCallback(
    (options: {
      scope: HTMLElement
      anchorId: string
      fingerprint: string
      textLength: number
      chunkMeta: ReturnType<typeof listenPlainAndChunksForScope>['chunks']
      startChunk: number
      startPlainOffset: number
    }) => {
      const { scope, anchorId, fingerprint, textLength, chunkMeta, startChunk, startPlainOffset } =
        options
      lastPersistedPlainOffsetRef.current = startPlainOffset
      const layers = buildProfileListenChunkQueueLayers(chunkMeta)
      applyChunkQueueLayers(scope, anchorId, fingerprint, textLength, layers)
      if (profileListenUsesGrok(voiceRef, fallbackRef)) {
        const grokPlayer = getGrokResourceListenPlayer()
        grokPlayer.configure({
          voiceId: voiceRef.current,
          withTimestamps: readAlongUnderlineEnabledRef.current,
        })
        const bootstrap: string[] = []
        for (let j = 0; j <= GROK_LISTEN_PREFETCH_AHEAD; j++) {
          const text = layers.speakChunks[startChunk + j]
          if (text) bootstrap.push(text)
        }
        grokPlayer.prefetchAhead(bootstrap)
      }
      ttsActiveRef.current = true
      speakChunkInternal(startChunk)
    },
    [
      applyChunkQueueLayers,
      fallbackRef,
      lastPersistedPlainOffsetRef,
      readAlongUnderlineEnabledRef,
      speakChunkInternal,
      voiceRef,
    ]
  )

  const bumpCancelGeneration = useCallback(() => {
    ttsCancelGenerationRef.current += 1
  }, [])

  return {
    applyChunkQueueLayers,
    beginChunkPlayback,
    bumpCancelGeneration,
    clearChunkQueue,
    restartCurrentChunkAtNewSpeed,
    speakChunkInternal,
    speakChunkInternalRef,
    stopActiveSession,
    ttsActiveRef,
    ttsChunkIndexRef,
    ttsCancelGenerationRef,
  }
}
