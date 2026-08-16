'use client'

/* eslint-disable react-hooks/refs -- Speech synthesis handlers and listen UI share mutable refs; labels read refs only after `listenUiTick` bumps. */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { GospelSection } from '@/lib/types'
import {
  readMemorizeListenSpeedFromStorage,
  toMemorizeWebSpeechUtteranceRate,
  writeMemorizeListenSpeedToStorage,
  type MemorizeListenSpeed,
} from '@/lib/memorizeListenSpeedStorage'
import {
  dispatchGospelExclusiveListenOwner,
  GOSPEL_WEB_SPEECH_EXCLUSIVE_OWNER_EVENT,
  type GospelWebSpeechExclusiveOwnerDetail,
} from '@/lib/exclusiveWebSpeechListen'
import {
  cancelProfileReadAloudSpeech,
  GOSPEL_PROFILE_READ_ALOUD_CANCELLED_EVENT,
  getProfileReadAloudSpeechEngine,
  isProfileReadAloudSpeechAvailable,
} from '@/lib/profileReadAloudSpeechEngine'
import { isMemorizeIosWebHost } from '@/lib/memorizationViewportPlatform'
import { getCurrentTocAnchorId } from '@/lib/tocAnchorFromScroll'
import type { ProfileListenTextOptions } from '@/lib/profileHighlightVisibleText'
import {
  listenCollapsedPlainFromRaw,
  plainTextForProfileResourceListen,
  visibleListenRawText,
} from '@/lib/profileResourceListenText'
import {
  chunkIndexContainingPlainOffset,
  splitListenRawIntoTtsChunksWithOffsets,
} from '@/lib/splitTextForTtsChunks'
import {
  clearReadAlongDomHighlight,
  updateReadAlongDomHighlight,
  updateReadAlongDomHighlightVisualLine,
  type ReadAlongHighlightPaint,
} from '@/lib/profileReadAlongDomHighlight'
import { findNextReadAlongScope } from '@/lib/profileReadAlongNextAnchor'
import {
  clearAllProfileReadAlongProgressForSlug,
  clearProfileReadAlongProgress,
  loadProfileReadAlongLastSession,
  loadProfileReadAlongProgress,
  readAlongTextFingerprint,
  saveProfileReadAlongLastSession,
  saveProfileReadAlongProgress,
} from '@/lib/profileReadAlongProgressStorage'
import { getReadAlongBoundaryUiLagMs } from '@/lib/readAlongBoundaryUiLag'
import { currentWordRangeInChunk, firstWordRangeInChunk } from '@/lib/readAlongSpeechWordRange'
import {
  prefersReducedMotionReadAlong,
  scrollReadAlongPlainOffsetIntoViewIfNeeded,
} from '@/lib/scrollReadAlongPlain'
import {
  buildBibleReferenceSpeakChunk,
  displayCharIndexInChunkForSpeakIndex,
  displayCharRangeInChunkForSpeakRange,
} from '@/lib/bibleReferenceSpeechTransform'
import {
  readProfileReadAlongUnderlineStyleFromStorage,
  writeProfileReadAlongUnderlineStyleToStorage,
  type ProfileReadAlongUnderlineStyle,
} from '@/lib/profileReadAlongUnderlineStyleStorage'
import { isListenOmitHeadingProfileSlug } from '@/lib/profileResourceListenText'
import { addPresentationReadCompleteSlug } from '@/lib/presentationReadCompleteStorage'
import { plainOffsetAtViewportSentenceStart } from '@/lib/profileReadingPosition'

/** After chunks ending in `.` `!` `?`, brief delay before the next utterance so engines do not run sentences together. */
const READ_ALONG_AFTER_SENTENCE_GAP_MS = 55
/** After a listen **segment** (block boundary), brief delay before the next utterance — avoids extra punctuation in text (which would skew Web Speech `charIndex` vs audio). */
const READ_ALONG_AFTER_SEGMENT_GAP_MS = 95

function listenPlainAndChunksForScope(scope: HTMLElement, listenTextOptions: ProfileListenTextOptions) {
  const raw = visibleListenRawText(scope, listenTextOptions)
  const text = listenCollapsedPlainFromRaw(raw)
  const chunks = splitListenRawIntoTtsChunksWithOffsets(raw)
  return { text, chunks }
}

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
  const [listenUiTick, setListenUiTick] = useState(0)

  const listenPlaybackRateRef = useRef(listenPlaybackRate)

  const memorizeListenTtsRateAtStartRef = useRef<MemorizeListenSpeed | null>(null)
  const memorizeListenTtsUserPausedRef = useRef(false)
  const memorizeListenTtsPostResumeRef = useRef(false)

  const speakChunkInternalRef = useRef<(chunkIndex: number) => void>(() => {})

  const ttsChunksRef = useRef<string[]>([])
  /** Per-chunk text passed to {@link SpeechSynthesisUtterance} (may expand `3:16` → `3 verse 16`). */
  const ttsChunksSpeakRef = useRef<string[]>([])
  /** For each chunk, one display-chunk character index per spoken character (same length as speak chunk). */
  const ttsChunkSpeakCharToDisplayCharRef = useRef<number[][]>([])
  const ttsChunkPlainStartsRef = useRef<number[]>([])
  /** When true, wait ~95ms before this chunk utterance (listen segment / block boundary). */
  const ttsPauseBeforeChunkRef = useRef<boolean[]>([])
  const ttsChunkIndexRef = useRef(0)
  const ttsActiveRef = useRef(false)
  /** Bumped on intentional cancel so stale `onend` handlers don't advance the queue. */
  const ttsCancelGenerationRef = useRef(0)

  const readAlongScopeRef = useRef<HTMLElement | null>(null)
  const readAlongPlainLenRef = useRef(0)
  /** Last painted highlight for scroll/resize refresh */
  const readAlongHighlightPaintRef = useRef<ReadAlongHighlightPaint | null>(null)
  const readAlongPendingUiRef = useRef<{
    scroll?: number
    highlight?: ReadAlongHighlightPaint | null
    /** Word boundaries fire rapidly; smooth scroll stacks and lags behind fixed underlines — use `auto` there. */
    scrollBehavior?: ScrollBehavior
  }>({})
  const readAlongUiRafRef = useRef(0)

  const profileSlugRef = useRef(profileSlug)
  const listenTextOptionsRef = useRef<ProfileListenTextOptions>({})
  const readAlongAnchorIdRef = useRef<string | null>(null)
  const readAlongFingerprintRef = useRef<string | null>(null)
  const lastPersistedPlainOffsetRef = useRef(0)
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Word underline while speaking (profile read-aloud); immediate ref for `speakChunkInternal`. */
  const readAlongUnderlineEnabledRef = useRef(true)
  const [readAlongUnderlineOn, setReadAlongUnderlineOn] = useState(true)
  const [readAlongUnderlineStyle, setReadAlongUnderlineStyleState] = useState<ProfileReadAlongUnderlineStyle>(() =>
    typeof window === 'undefined' ? 'word' : readProfileReadAlongUnderlineStyleFromStorage()
  )
  const readAlongUnderlineStyleRef = useRef(readAlongUnderlineStyle)
  /** Invalidates delayed boundary UI when clearing session or superseding with a newer boundary. */
  const readAlongBoundaryLagSeqRef = useRef(0)

  useLayoutEffect(() => {
    profileSlugRef.current = profileSlug
    listenTextOptionsRef.current = {
      omitHeadingText: isListenOmitHeadingProfileSlug(profileSlug ?? ''),
    }
  }, [profileSlug])

  useLayoutEffect(() => {
    readAlongUnderlineStyleRef.current = readAlongUnderlineStyle
  }, [readAlongUnderlineStyle])

  const bumpListen = useCallback(() => {
    setListenUiTick((t) => t + 1)
  }, [])

  const flushReadAlongProgressPersist = useCallback(() => {
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current)
      persistTimerRef.current = null
    }
    const slug = profileSlugRef.current
    if (!slug) return
    const anchor = readAlongAnchorIdRef.current
    const fp = readAlongFingerprintRef.current
    const plainLen = readAlongPlainLenRef.current
    const off = lastPersistedPlainOffsetRef.current
    if (!anchor || !fp || plainLen <= 0 || off < 0) return
    if (off >= plainLen) return
    saveProfileReadAlongProgress(slug, anchor, off, fp)
    saveProfileReadAlongLastSession(slug, anchor, off, fp)
  }, [])

  const scheduleReadAlongProgressPersist = useCallback(() => {
    if (!profileSlugRef.current) return
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
    persistTimerRef.current = setTimeout(() => {
      persistTimerRef.current = null
      flushReadAlongProgressPersist()
    }, 450)
  }, [flushReadAlongProgressPersist])

  const recordReadAlongProgressPlainOffset = useCallback(
    (plainOffset: number) => {
      if (!profileSlugRef.current || !ttsActiveRef.current) return
      const plainLen = readAlongPlainLenRef.current
      if (plainLen <= 0) return
      const clamped = Math.max(0, Math.min(plainOffset, plainLen - 1))
      lastPersistedPlainOffsetRef.current = Math.max(lastPersistedPlainOffsetRef.current, clamped)
      scheduleReadAlongProgressPersist()
    },
    [scheduleReadAlongProgressPersist]
  )

  const cancelReadAlongUiScheduling = useCallback(() => {
    if (readAlongUiRafRef.current !== 0) {
      cancelAnimationFrame(readAlongUiRafRef.current)
      readAlongUiRafRef.current = 0
    }
    readAlongPendingUiRef.current = {}
  }, [])

  const scheduleReadAlongUi = useCallback(
    (patch: {
      scroll?: number
      highlight?: ReadAlongHighlightPaint | null
      scrollBehavior?: ScrollBehavior
    }) => {
      const acc = readAlongPendingUiRef.current
      if (patch.scroll !== undefined) acc.scroll = patch.scroll
      if (patch.highlight !== undefined) acc.highlight = patch.highlight
      if (patch.scrollBehavior !== undefined) acc.scrollBehavior = patch.scrollBehavior

      if (readAlongUiRafRef.current !== 0) return
      readAlongUiRafRef.current = requestAnimationFrame(() => {
        readAlongUiRafRef.current = 0
        const pending = readAlongPendingUiRef.current
        readAlongPendingUiRef.current = {}

        const scope = readAlongScopeRef.current
        const plainLen = readAlongPlainLenRef.current

        if (pending.scroll !== undefined && scope && plainLen > 0) {
          const behavior: ScrollBehavior = prefersReducedMotionReadAlong()
            ? 'auto'
            : (pending.scrollBehavior ?? 'smooth')
          scrollReadAlongPlainOffsetIntoViewIfNeeded(
            scope,
            plainLen,
            pending.scroll,
            behavior,
            listenTextOptionsRef.current
          )
        }

        if (pending.highlight !== undefined) {
          if (pending.highlight === null) {
            readAlongHighlightPaintRef.current = null
            if (typeof document !== 'undefined') clearReadAlongDomHighlight(document)
          } else if (scope && plainLen > 0) {
            const h = pending.highlight
            readAlongHighlightPaintRef.current = h
            if (h.kind === 'word' && h.endExclusive > h.start) {
              updateReadAlongDomHighlight({
                scope,
                plainCollapsedLen: plainLen,
                plainStart: h.start,
                plainEndExclusive: h.endExclusive,
                listenTextOptions: listenTextOptionsRef.current,
              })
            } else if (h.kind === 'line') {
              updateReadAlongDomHighlightVisualLine({
                scope,
                plainCollapsedLen: plainLen,
                plainCaret: h.plainCaret,
                listenTextOptions: listenTextOptionsRef.current,
              })
            }
          }
        }
      })
    },
    []
  )

  const clearReadAlongSession = useCallback(() => {
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current)
      persistTimerRef.current = null
    }
    cancelReadAlongUiScheduling()
    readAlongHighlightPaintRef.current = null
    if (typeof document !== 'undefined') clearReadAlongDomHighlight(document)
    readAlongScopeRef.current = null
    readAlongPlainLenRef.current = 0
    ttsChunkPlainStartsRef.current = []
    ttsPauseBeforeChunkRef.current = []
    readAlongAnchorIdRef.current = null
    readAlongFingerprintRef.current = null
    lastPersistedPlainOffsetRef.current = 0
    readAlongBoundaryLagSeqRef.current += 1
  }, [cancelReadAlongUiScheduling])

  const stopProfileReadAloudFromExternalSource = useCallback(() => {
    ttsCancelGenerationRef.current += 1
    ttsActiveRef.current = false
    ttsChunkIndexRef.current = 0
    memorizeListenTtsRateAtStartRef.current = null
    memorizeListenTtsUserPausedRef.current = false
    memorizeListenTtsPostResumeRef.current = false
    flushReadAlongProgressPersist()
    clearReadAlongSession()
    setControlsOpen(false)
    bumpListen()
  }, [bumpListen, clearReadAlongSession, flushReadAlongProgressPersist])

  useEffect(() => {
    if (typeof window === 'undefined') return
    let raf = 0
    const onViewportChange = () => {
      if (raf !== 0) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const hl = readAlongHighlightPaintRef.current
        const scope = readAlongScopeRef.current
        const plainLen = readAlongPlainLenRef.current
        if (!hl || !scope || plainLen <= 0) return
        if (hl.kind === 'word' && hl.endExclusive <= hl.start) return
        if (hl.kind === 'word') {
          updateReadAlongDomHighlight({
            scope,
            plainCollapsedLen: plainLen,
            plainStart: hl.start,
            plainEndExclusive: hl.endExclusive,
            listenTextOptions: listenTextOptionsRef.current,
          })
        } else {
          updateReadAlongDomHighlightVisualLine({
            scope,
            plainCollapsedLen: plainLen,
            plainCaret: hl.plainCaret,
            listenTextOptions: listenTextOptionsRef.current,
          })
        }
      })
    }
    window.addEventListener('scroll', onViewportChange, { passive: true })
    window.addEventListener('resize', onViewportChange)
    return () => {
      window.removeEventListener('scroll', onViewportChange)
      window.removeEventListener('resize', onViewportChange)
      if (raf !== 0) cancelAnimationFrame(raf)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onExclusive = (ev: Event) => {
      const ce = ev as CustomEvent<GospelWebSpeechExclusiveOwnerDetail>
      if (!ce.detail) return
      switch (ce.detail.owner) {
        case 'profile-resource-read-aloud':
          return
        case 'memorize-practice':
        case 'scripture-chapter-audio':
          break
        default: {
          const _exhaustive: never = ce.detail.owner
          return _exhaustive
        }
      }
      stopProfileReadAloudFromExternalSource()
    }
    window.addEventListener(GOSPEL_WEB_SPEECH_EXCLUSIVE_OWNER_EVENT, onExclusive)
    return () => window.removeEventListener(GOSPEL_WEB_SPEECH_EXCLUSIVE_OWNER_EVENT, onExclusive)
  }, [stopProfileReadAloudFromExternalSource])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onCancelled = () => {
      stopProfileReadAloudFromExternalSource()
    }
    window.addEventListener(GOSPEL_PROFILE_READ_ALOUD_CANCELLED_EVENT, onCancelled)
    return () => window.removeEventListener(GOSPEL_PROFILE_READ_ALOUD_CANCELLED_EVENT, onCancelled)
  }, [stopProfileReadAloudFromExternalSource])

  useEffect(() => {
    return () => {
      readAlongBoundaryLagSeqRef.current += 1
      flushReadAlongProgressPersist()
      cancelReadAlongUiScheduling()
      if (typeof document !== 'undefined') clearReadAlongDomHighlight(document)
      cancelProfileReadAloudSpeech()
    }
  }, [cancelReadAlongUiScheduling, flushReadAlongProgressPersist])

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
  }, [sections, onNothingToRead])

  const speakChunkInternal = useCallback(
    (chunkIndex: number) => {
      if (typeof window === 'undefined' || !isProfileReadAloudSpeechAvailable()) return

      const engine = getProfileReadAloudSpeechEngine()
      const chunks = ttsChunksRef.current
      if (chunkIndex >= chunks.length) {
        const slug = profileSlugRef.current
        const anchorDone = readAlongAnchorIdRef.current
        const completedScope = readAlongScopeRef.current
        if (persistTimerRef.current) {
          clearTimeout(persistTimerRef.current)
          persistTimerRef.current = null
        }
        memorizeListenTtsRateAtStartRef.current = null
        clearReadAlongSession()
        if (slug && anchorDone) clearProfileReadAlongProgress(slug, anchorDone)

        const next =
          anchorDone && typeof document !== 'undefined'
            ? findNextReadAlongScope(sections, completedScope, anchorDone, listenTextOptionsRef.current)
            : null

        const nextListenableChunkCount =
          next && typeof document !== 'undefined'
            ? listenPlainAndChunksForScope(next.scope, listenTextOptionsRef.current).chunks.length
            : 0

        if (next && nextListenableChunkCount > 0) {
          const fingerprint = readAlongTextFingerprint(next.text)
          const { chunks: chunkMeta } = listenPlainAndChunksForScope(next.scope, listenTextOptionsRef.current)
          if (chunkMeta.length > 0) {
            lastPersistedPlainOffsetRef.current = 0
            readAlongAnchorIdRef.current = next.anchorId
            readAlongFingerprintRef.current = fingerprint
            readAlongScopeRef.current = next.scope
            readAlongPlainLenRef.current = next.text.length
            ttsChunkPlainStartsRef.current = chunkMeta.map((c) => c.plainStart)
            ttsPauseBeforeChunkRef.current = chunkMeta.map((c) => Boolean(c.pauseBefore))
            const displayChunks = chunkMeta.map((c) => c.text)
            ttsChunksRef.current = displayChunks
            const speakLayers = displayChunks.map((t) => buildBibleReferenceSpeakChunk(t))
            ttsChunksSpeakRef.current = speakLayers.map((l) => l.speakText)
            ttsChunkSpeakCharToDisplayCharRef.current = speakLayers.map((l) => l.speakCharToDisplayCharIndex)
            ttsActiveRef.current = true
            if (slug) {
              saveProfileReadAlongLastSession(slug, next.anchorId, 0, fingerprint)
            }
            next.scope.scrollIntoView({
              block: 'center',
              behavior: prefersReducedMotionReadAlong() ? 'auto' : 'smooth',
            })
            bumpListen()
            speakChunkInternalRef.current(0)
            return
          }
        }

        if (slug && anchorDone && (next === null || nextListenableChunkCount === 0)) {
          addPresentationReadCompleteSlug(slug)
        }

        ttsActiveRef.current = false
        ttsChunkIndexRef.current = 0
        bumpListen()
        return
      }

      const displayChunk = chunks[chunkIndex]
      if (!displayChunk) {
        speakChunkInternalRef.current(chunkIndex + 1)
        return
      }

      const speakChunkStored = ttsChunksSpeakRef.current[chunkIndex]
      const speakMapStored = ttsChunkSpeakCharToDisplayCharRef.current[chunkIndex]
      const speakChunk =
        speakChunkStored &&
        speakMapStored &&
        speakMapStored.length === speakChunkStored.length &&
        speakChunkStored.length > 0
          ? speakChunkStored
          : displayChunk
      const speakMap: number[] =
        speakMapStored && speakMapStored.length === speakChunk.length
          ? speakMapStored
          : Array.from({ length: speakChunk.length }, (_, i) => i)

      ttsChunkIndexRef.current = chunkIndex
      const birthGen = ttsCancelGenerationRef.current

      memorizeListenTtsUserPausedRef.current = false
      memorizeListenTtsPostResumeRef.current = false

      const rate = listenPlaybackRateRef.current
      const utteranceRate = toMemorizeWebSpeechUtteranceRate(rate, isMemorizeIosWebHost())
      memorizeListenTtsRateAtStartRef.current = rate

      engine.speak(speakChunk, utteranceRate, {
        onstart: () => {
          memorizeListenTtsPostResumeRef.current = false
          bumpListen()
          const scope = readAlongScopeRef.current
          const plainLen = readAlongPlainLenRef.current
          const chunkStart = ttsChunkPlainStartsRef.current[chunkIndex] ?? 0
          recordReadAlongProgressPlainOffset(chunkStart)
          if (!scope || plainLen <= 0) return

          if (prefersReducedMotionReadAlong()) {
            scheduleReadAlongUi({
                scroll: chunkStart,
                highlight: readAlongUnderlineEnabledRef.current
                ? {
                  kind: 'word',
                  start: chunkStart,
                  endExclusive: chunkStart + displayChunk.length,
                }
                : null,
            })
            return
          }

          const fw = firstWordRangeInChunk(speakChunk)
          if (fw) {
            const dr = displayCharRangeInChunkForSpeakRange(
              fw.relStart,
              fw.relEndExclusive,
              speakMap,
              displayChunk.length
            )
            const plainWordStart = chunkStart + dr.displayStart
            const plainWordEnd = chunkStart + dr.displayEndExclusive
            recordReadAlongProgressPlainOffset(plainWordStart)
            const mid = Math.floor((plainWordStart + plainWordEnd - 1) / 2)
            const plainOffset = Math.min(Math.max(0, plainLen - 1), Math.max(chunkStart, mid))
            const lineMode = readAlongUnderlineStyleRef.current === 'line'
            scheduleReadAlongUi({
                scroll: plainOffset,
                highlight: readAlongUnderlineEnabledRef.current
                ? lineMode
                ? { kind: 'line', plainCaret: plainOffset }
                : { kind: 'word', start: plainWordStart, endExclusive: plainWordEnd }
                : null,
            })
          } else {
            scheduleReadAlongUi({ scroll: chunkStart })
          }
        },
        onboundary: (ev) => {
          if (birthGen !== ttsCancelGenerationRef.current) return
          if (engine.isPaused()) return
          const scope = readAlongScopeRef.current
          const plainLen = readAlongPlainLenRef.current
          if (!scope || plainLen <= 0) return
          const chunkStart = ttsChunkPlainStartsRef.current[chunkIndex] ?? 0
          const ci = typeof ev.charIndex === 'number' ? ev.charIndex : 0
          const inChunkSpeak = Math.max(0, Math.min(ci, speakChunk.length))
          const displayInChunk = displayCharIndexInChunkForSpeakIndex(inChunkSpeak, speakMap, displayChunk.length)
          const target = chunkStart + displayInChunk
          const clampedTarget = Math.min(Math.max(0, plainLen - 1), target)

          const lagMs = prefersReducedMotionReadAlong() ? 0 : getReadAlongBoundaryUiLagMs()

          const applyBoundaryUi = () => {
            if (birthGen !== ttsCancelGenerationRef.current) return
            if (!ttsActiveRef.current) return
            if (engine.isPaused()) return
            if (ttsChunkIndexRef.current !== chunkIndex) return

            const wr = currentWordRangeInChunk(speakChunk, ev)
            let progressPlain: number
            if (wr) {
              const drp = displayCharRangeInChunkForSpeakRange(
                wr.relStart,
                wr.relEndExclusive,
                speakMap,
                displayChunk.length
              )
              progressPlain = Math.min(Math.max(0, plainLen - 1), chunkStart + drp.displayStart)
            } else {
              progressPlain = clampedTarget
            }
            recordReadAlongProgressPlainOffset(progressPlain)

            if (prefersReducedMotionReadAlong()) {
              scheduleReadAlongUi({ scroll: progressPlain, scrollBehavior: 'auto' })
              return
            }

            if (wr) {
              const dr = displayCharRangeInChunkForSpeakRange(
                wr.relStart,
                wr.relEndExclusive,
                speakMap,
                displayChunk.length
              )
              const plainWordStart = chunkStart + dr.displayStart
              const plainWordEnd = chunkStart + dr.displayEndExclusive
              const speakMid = Math.floor((wr.relStart + wr.relEndExclusive - 1) / 2)
              const dispMid = displayCharIndexInChunkForSpeakIndex(speakMid, speakMap, displayChunk.length)
              const scrollMid = Math.min(Math.max(0, plainLen - 1), chunkStart + dispMid)
              const lineMode = readAlongUnderlineStyleRef.current === 'line'
              scheduleReadAlongUi({
                  scroll: scrollMid,
                  highlight: readAlongUnderlineEnabledRef.current
                  ? lineMode
                  ? { kind: 'line', plainCaret: scrollMid }
                  : { kind: 'word', start: plainWordStart, endExclusive: plainWordEnd }
                  : null,
                  scrollBehavior: 'auto',
              })
            } else {
              const lineMode = readAlongUnderlineStyleRef.current === 'line'
              scheduleReadAlongUi({
                  scroll: progressPlain,
                  scrollBehavior: 'auto',
                  ...(readAlongUnderlineEnabledRef.current && lineMode
                    ? { highlight: { kind: 'line', plainCaret: progressPlain } as const }
                    : {}),
              })
            }
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
          memorizeListenTtsRateAtStartRef.current = null
          bumpListen()
          const nextIndex = chunkIndex + 1
          const runNext = () => {
            if (birthGen !== ttsCancelGenerationRef.current) return
            speakChunkInternalRef.current(nextIndex)
          }
          const trimmedEnd = displayChunk.trimEnd()
          const hasMore = nextIndex < chunks.length
          const afterFullStop = hasMore && /[.!?]['"]?$/.test(trimmedEnd)
          const segmentPause = hasMore && ttsPauseBeforeChunkRef.current[nextIndex] === true
          const gapMs = Math.max(
            afterFullStop ? READ_ALONG_AFTER_SENTENCE_GAP_MS : 0,
            segmentPause ? READ_ALONG_AFTER_SEGMENT_GAP_MS : 0
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
          memorizeListenTtsRateAtStartRef.current = null
          clearReadAlongSession()
          bumpListen()
        },
      })
      bumpListen()
    },
    [
      bumpListen,
      clearReadAlongSession,
      recordReadAlongProgressPlainOffset,
      scheduleReadAlongUi,
      sections,
    ]
  )

  useLayoutEffect(() => {
    listenPlaybackRateRef.current = listenPlaybackRate
  }, [listenPlaybackRate])

  useLayoutEffect(() => {
    speakChunkInternalRef.current = speakChunkInternal
  }, [speakChunkInternal])

  const startReadAloudSession = useCallback(
    (
      fromBeginning: boolean,
      forcedResolved?: { scope: HTMLElement; text: string },
      forcedStartPlainOffset?: number
    ) => {
      if (typeof window === 'undefined' || !isProfileReadAloudSpeechAvailable()) return

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
              const fp = readAlongTextFingerprint(text)
              const offsetOk = last.plainOffset >= 0 && last.plainOffset < text.length
              const fpOk = text.length > 0 && last.fingerprint === fp
              const useOtherAnchor = last.anchorId !== scrollAnchorId
              const midProgress = last.plainOffset > 0
              if (fpOk && offsetOk && (useOtherAnchor || midProgress)) {
                resolved = { scope: el, text }
                el.scrollIntoView({
                  block: 'center',
                  behavior: prefersReducedMotionReadAlong() ? 'auto' : 'smooth',
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

      getProfileReadAloudSpeechEngine().cancel()
      dispatchGospelExclusiveListenOwner({ owner: 'profile-resource-read-aloud' })
      cancelReadAlongUiScheduling()
      readAlongHighlightPaintRef.current = null
      if (typeof document !== 'undefined') clearReadAlongDomHighlight(document)
      ttsCancelGenerationRef.current += 1

      const chunkMeta = listenPlainAndChunksForScope(resolved.scope, listenTextOptionsRef.current).chunks
      if (chunkMeta.length === 0) return

      let startChunk = 0
      lastPersistedPlainOffsetRef.current = 0
      if (useForcedStartOffset) {
        const offset = Math.max(0, Math.min(forcedStartPlainOffset, resolved.text.length))
        startChunk = chunkIndexContainingPlainOffset(chunkMeta, offset)
        lastPersistedPlainOffsetRef.current = offset
      } else if (!fromBeginning && slug) {
        const saved = loadProfileReadAlongProgress(slug, anchorId)
        if (
          saved &&
          saved.fingerprint === fingerprint &&
          saved.plainOffset > 0 &&
          saved.plainOffset < resolved.text.length
        ) {
          startChunk = chunkIndexContainingPlainOffset(chunkMeta, saved.plainOffset)
          lastPersistedPlainOffsetRef.current = saved.plainOffset
        }
      }

      readAlongAnchorIdRef.current = anchorId
      readAlongFingerprintRef.current = fingerprint
      readAlongScopeRef.current = resolved.scope
      readAlongPlainLenRef.current = resolved.text.length
      ttsChunkPlainStartsRef.current = chunkMeta.map((c) => c.plainStart)
      ttsPauseBeforeChunkRef.current = chunkMeta.map((c) => Boolean(c.pauseBefore))
      const displayChunks = chunkMeta.map((c) => c.text)
      ttsChunksRef.current = displayChunks
      const speakLayers = displayChunks.map((t) => buildBibleReferenceSpeakChunk(t))
      ttsChunksSpeakRef.current = speakLayers.map((l) => l.speakText)
      ttsChunkSpeakCharToDisplayCharRef.current = speakLayers.map((l) => l.speakCharToDisplayCharIndex)
      ttsActiveRef.current = true
      speakChunkInternal(startChunk)
    },
    [cancelReadAlongUiScheduling, resolveListenScopeAndText, speakChunkInternal]
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
    getProfileReadAloudSpeechEngine().cancel()
    ttsCancelGenerationRef.current += 1
    cancelReadAlongUiScheduling()
    clearReadAlongSession()

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
      behavior: prefersReducedMotionReadAlong() ? 'auto' : 'smooth',
    })
    startReadAloudSession(true, { scope: first.scope, text: first.text })
  }, [
    cancelReadAlongUiScheduling,
    clearReadAlongSession,
    onNothingToRead,
    sections,
    startReadAloudSession,
  ])

  const startReadAloudFromHere = useCallback(() => {
    const resolved = resolveListenScopeAndText()
    if (!resolved) return

    const chunkMeta = listenPlainAndChunksForScope(
      resolved.scope,
      listenTextOptionsRef.current
    ).chunks
    if (chunkMeta.length === 0) return

    const offset = plainOffsetAtViewportSentenceStart(
      resolved.scope,
      chunkMeta,
      listenTextOptionsRef.current
    )
    startReadAloudSession(false, resolved, offset)
  }, [resolveListenScopeAndText, startReadAloudSession])

  const handlePrimaryClick = useCallback(() => {
    if (typeof window === 'undefined' || !isProfileReadAloudSpeechAvailable()) {
      onNothingToRead?.('Listen is not supported in this browser.')
      return
    }
    const engine = getProfileReadAloudSpeechEngine()

    if (engine.isSpeaking()) {
      if (engine.isPaused()) {
        memorizeListenTtsUserPausedRef.current = false
        const atStart = memorizeListenTtsRateAtStartRef.current
        if (atStart != null && listenPlaybackRateRef.current !== atStart) {
          ttsCancelGenerationRef.current += 1
          engine.cancel()
          memorizeListenTtsRateAtStartRef.current = null
          memorizeListenTtsPostResumeRef.current = false
          speakChunkInternalRef.current(ttsChunkIndexRef.current)
        } else {
          memorizeListenTtsPostResumeRef.current = true
          dispatchGospelExclusiveListenOwner({ owner: 'profile-resource-read-aloud' })
          engine.resume()
          window.setTimeout(bumpListen, 24)
          window.setTimeout(bumpListen, 72)
        }
      } else {
        memorizeListenTtsUserPausedRef.current = true
        memorizeListenTtsPostResumeRef.current = false
        engine.pause()
        flushReadAlongProgressPersist()
      }
      bumpListen()
      queueMicrotask(bumpListen)
      return
    }

    if (!ttsActiveRef.current) {
      startReadAloudSession(false)
    }
    bumpListen()
  }, [
    bumpListen,
    flushReadAlongProgressPersist,
    onNothingToRead,
    startReadAloudSession,
  ])

  const listenButtonLabel = useMemo(() => {
    void listenUiTick
    if (typeof window === 'undefined' || !isProfileReadAloudSpeechAvailable()) return 'Play'
    const engine = getProfileReadAloudSpeechEngine()
    if (memorizeListenTtsUserPausedRef.current) return 'Play'
    if (memorizeListenTtsPostResumeRef.current && engine.isSpeaking()) return 'Pause'
    if (engine.isSpeaking() && !engine.isPaused()) return 'Pause'
    return 'Play'
  }, [listenUiTick])

  const listenAriaPressed = useMemo(() => {
    void listenUiTick
    if (typeof window === 'undefined' || !isProfileReadAloudSpeechAvailable()) return false
    const engine = getProfileReadAloudSpeechEngine()
    if (memorizeListenTtsUserPausedRef.current) return false
    if (memorizeListenTtsPostResumeRef.current && engine.isSpeaking()) return true
    return engine.isSpeaking() && !engine.isPaused()
  }, [listenUiTick])

  const readAloudDialogPrimaryLabel = listenButtonLabel
  const readAloudDialogPrimaryAriaLabel =
    listenButtonLabel === 'Pause'
      ? 'Pause read-aloud of the current section'
      : 'Play: read the current section aloud'

  const openControls = useCallback(() => setControlsOpen(true), [])
  const closeControls = useCallback(() => setControlsOpen(false), [])

  const toggleReadAlongUnderline = useCallback(() => {
    setReadAlongUnderlineOn((prev) => {
      const next = !prev
      readAlongUnderlineEnabledRef.current = next
      if (!next) {
        readAlongHighlightPaintRef.current = null
        if (typeof document !== 'undefined') clearReadAlongDomHighlight(document)
        scheduleReadAlongUi({ highlight: null })
      }
      queueMicrotask(bumpListen)
      return next
    })
  }, [bumpListen, scheduleReadAlongUi])

  const setReadAlongUnderlineStyle = useCallback(
    (style: ProfileReadAlongUnderlineStyle) => {
      readAlongUnderlineStyleRef.current = style
      setReadAlongUnderlineStyleState(style)
      writeProfileReadAlongUnderlineStyleToStorage(style)
      queueMicrotask(bumpListen)
    },
    [bumpListen]
  )

  const onSelectSpeed = useCallback(
    (r: MemorizeListenSpeed) => {
      listenPlaybackRateRef.current = r
      setListenPlaybackRate(r)
      writeMemorizeListenSpeedToStorage(r)
      bumpListen()

      if (!ttsActiveRef.current) return
      const engine = getProfileReadAloudSpeechEngine()
      /** Paused: wait for Resume so we don't unpause by surprise (refs already updated). */
      if (!engine.isSpeaking() || engine.isPaused()) return

      const i = ttsChunkIndexRef.current
      ttsCancelGenerationRef.current += 1
      engine.cancel()
      memorizeListenTtsUserPausedRef.current = false
      memorizeListenTtsPostResumeRef.current = false
      queueMicrotask(() => speakChunkInternalRef.current(i))
    },
    [bumpListen]
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
