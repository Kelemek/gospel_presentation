'use client'

import { useCallback, useLayoutEffect, useRef, type MutableRefObject } from 'react'
import type { GospelSection } from '@/lib/types'
import {
  getGospelListenSpeechEngine,
  isGospelListenSpeechAvailable,
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
import { prefersReducedMotionReadAlong } from '@/lib/scrollReadAlongPlain'
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
}

export function useProfileListenChunkQueue({
  sections,
  readAlong,
  listenPlaybackRateRef,
  rateAtStartRef,
  prepareUtteranceStart,
  markUtteranceStarted,
  resetPlaybackState,
}: UseProfileListenChunkQueueOptions) {
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
  }, [resetPlaybackState])

  const speakChunkInternal = useCallback(
    (chunkIndex: number) => {
      if (typeof window === 'undefined' || !isGospelListenSpeechAvailable()) return

      const engine = getGospelListenSpeechEngine()
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
                  listenTextOptionsRef.current
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
          nextScope.scope.scrollIntoView({
            block: 'center',
            behavior: prefersReducedMotionReadAlong() ? 'auto' : 'smooth',
          })
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

      engine.speak(speakChunk, utteranceRate, {
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
          if (engine.isPaused()) return
          const scope = readAlongScopeRef.current
          const plainLen = readAlongPlainLenRef.current
          if (!scope || plainLen <= 0) return
          const chunkStart = ttsChunkPlainStartsRef.current[chunkIndex] ?? 0
          const reducedMotion = prefersReducedMotionReadAlong()
          const lagMs = reducedMotion ? 0 : getReadAlongBoundaryUiLagMs()

          const applyBoundaryUi = () => {
            if (birthGen !== ttsCancelGenerationRef.current) return
            if (!ttsActiveRef.current) return
            if (engine.isPaused()) return
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
            ttsPauseBeforeChunkRef.current
          )
          if (gapMs > 0 && typeof window !== 'undefined') {
            window.setTimeout(runNext, gapMs)
          } else {
            runNext()
          }
        },
        onerror: () => {
          if (birthGen !== ttsCancelGenerationRef.current) return
          ttsActiveRef.current = false
          ttsChunkIndexRef.current = 0
          rateAtStartRef.current = null
          clearChunkQueue()
        },
      })
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
      sections,
    ]
  )

  useLayoutEffect(() => {
    speakChunkInternalRef.current = speakChunkInternal
  }, [speakChunkInternal])

  const restartCurrentChunkAtNewSpeed = useCallback(() => {
    if (!ttsActiveRef.current) return
    const engine = getGospelListenSpeechEngine()
    if (!engine.isSpeaking() || engine.isPaused()) return
    const i = ttsChunkIndexRef.current
    ttsCancelGenerationRef.current += 1
    engine.cancel()
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
      ttsActiveRef.current = true
      speakChunkInternal(startChunk)
    },
    [applyChunkQueueLayers, lastPersistedPlainOffsetRef, speakChunkInternal]
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
