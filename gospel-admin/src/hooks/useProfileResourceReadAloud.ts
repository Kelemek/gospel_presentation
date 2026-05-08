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
import { isMemorizeAndroidWebHost, isMemorizeIosWebHost } from '@/lib/memorizationViewportPlatform'
import { getCurrentTocAnchorId } from '@/lib/tocAnchorFromScroll'
import { plainTextForProfileResourceListen } from '@/lib/profileResourceListenText'
import {
  chunkIndexContainingPlainOffset,
  splitTextForTtsChunksWithOffsets,
} from '@/lib/splitTextForTtsChunks'
import {
  clearReadAlongDomHighlight,
  updateReadAlongDomHighlight,
  updateReadAlongDomHighlightVisualLine,
  type ReadAlongHighlightPaint,
} from '@/lib/profileReadAlongDomHighlight'
import { findNextReadAlongScope } from '@/lib/profileReadAlongNextAnchor'
import {
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
  GOSPEL_WEB_SPEECH_EXCLUSIVE_OWNER_EVENT,
  type GospelWebSpeechExclusiveOwnerDetail,
} from '@/lib/exclusiveWebSpeechListen'
import {
  readProfileReadAlongUnderlineStyleFromStorage,
  writeProfileReadAlongUnderlineStyleToStorage,
  type ProfileReadAlongUnderlineStyle,
} from '@/lib/profileReadAlongUnderlineStyleStorage'

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
  const ttsChunkPlainStartsRef = useRef<number[]>([])
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

  const androidHost = useMemo(() => isMemorizeAndroidWebHost(), [])

  useLayoutEffect(() => {
    profileSlugRef.current = profileSlug
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
    if (androidHost) return
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
  }, [androidHost])

  const scheduleReadAlongProgressPersist = useCallback(() => {
    if (androidHost || !profileSlugRef.current) return
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
    persistTimerRef.current = setTimeout(() => {
      persistTimerRef.current = null
      flushReadAlongProgressPersist()
    }, 450)
  }, [androidHost, flushReadAlongProgressPersist])

  const recordReadAlongProgressPlainOffset = useCallback(
    (plainOffset: number) => {
      if (androidHost || !profileSlugRef.current || !ttsActiveRef.current) return
      const plainLen = readAlongPlainLenRef.current
      if (plainLen <= 0) return
      const clamped = Math.max(0, Math.min(plainOffset, plainLen - 1))
      lastPersistedPlainOffsetRef.current = Math.max(lastPersistedPlainOffsetRef.current, clamped)
      scheduleReadAlongProgressPersist()
    },
    [androidHost, scheduleReadAlongProgressPersist]
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
          scrollReadAlongPlainOffsetIntoViewIfNeeded(scope, plainLen, pending.scroll, behavior)
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
              })
            } else if (h.kind === 'line') {
              updateReadAlongDomHighlightVisualLine({
                scope,
                plainCollapsedLen: plainLen,
                plainCaret: h.plainCaret,
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
    readAlongAnchorIdRef.current = null
    readAlongFingerprintRef.current = null
    lastPersistedPlainOffsetRef.current = 0
    readAlongBoundaryLagSeqRef.current += 1
  }, [cancelReadAlongUiScheduling])

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
          })
        } else {
          updateReadAlongDomHighlightVisualLine({
            scope,
            plainCollapsedLen: plainLen,
            plainCaret: hl.plainCaret,
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
      if (!ce.detail || ce.detail.owner !== 'memorize-practice') return
      ttsCancelGenerationRef.current += 1
      ttsActiveRef.current = false
      ttsChunkIndexRef.current = 0
      memorizeListenTtsRateAtStartRef.current = null
      memorizeListenTtsUserPausedRef.current = false
      memorizeListenTtsPostResumeRef.current = false
      flushReadAlongProgressPersist()
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      clearReadAlongSession()
      setControlsOpen(false)
      bumpListen()
    }
    window.addEventListener(GOSPEL_WEB_SPEECH_EXCLUSIVE_OWNER_EVENT, onExclusive)
    return () => window.removeEventListener(GOSPEL_WEB_SPEECH_EXCLUSIVE_OWNER_EVENT, onExclusive)
  }, [bumpListen, clearReadAlongSession, flushReadAlongProgressPersist])

  useEffect(() => {
    return () => {
      readAlongBoundaryLagSeqRef.current += 1
      flushReadAlongProgressPersist()
      cancelReadAlongUiScheduling()
      if (typeof document !== 'undefined') clearReadAlongDomHighlight(document)
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
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
    const text = plainTextForProfileResourceListen(el)
    if (!text) {
      onNothingToRead?.('There is no readable text in this section.')
      return null
    }
    return { scope: el, text }
  }, [sections, onNothingToRead])

  const speakChunkInternal = useCallback(
    (chunkIndex: number) => {
      if (androidHost) return
      if (typeof window === 'undefined' || !window.speechSynthesis) return

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
            ? findNextReadAlongScope(sections, completedScope, anchorDone)
            : null

        if (next && !androidHost) {
          const fingerprint = readAlongTextFingerprint(next.text)
          const chunkMeta = splitTextForTtsChunksWithOffsets(next.text)
          if (chunkMeta.length > 0) {
            lastPersistedPlainOffsetRef.current = 0
            readAlongAnchorIdRef.current = next.anchorId
            readAlongFingerprintRef.current = fingerprint
            readAlongScopeRef.current = next.scope
            readAlongPlainLenRef.current = next.text.length
            ttsChunkPlainStartsRef.current = chunkMeta.map((c) => c.plainStart)
            ttsChunksRef.current = chunkMeta.map((c) => c.text)
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

        ttsActiveRef.current = false
        ttsChunkIndexRef.current = 0
        bumpListen()
        return
      }

      const syn = window.speechSynthesis
      const text = chunks[chunkIndex]
      if (!text) {
        speakChunkInternalRef.current(chunkIndex + 1)
        return
      }

      ttsChunkIndexRef.current = chunkIndex
      const birthGen = ttsCancelGenerationRef.current

      memorizeListenTtsUserPausedRef.current = false
      memorizeListenTtsPostResumeRef.current = false

      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'en-US'
      const rate = listenPlaybackRateRef.current
      u.rate = toMemorizeWebSpeechUtteranceRate(rate, isMemorizeIosWebHost())
      memorizeListenTtsRateAtStartRef.current = rate

      u.onstart = () => {
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
                  endExclusive: chunkStart + text.length,
                }
              : null,
          })
          return
        }

        const fw = firstWordRangeInChunk(text)
        if (fw) {
          const plainWordStart = chunkStart + fw.relStart
          const plainWordEnd = chunkStart + fw.relEndExclusive
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
      }

      u.onboundary = (ev: SpeechSynthesisEvent) => {
        if (birthGen !== ttsCancelGenerationRef.current) return
        if (window.speechSynthesis.paused) return
        const scope = readAlongScopeRef.current
        const plainLen = readAlongPlainLenRef.current
        if (!scope || plainLen <= 0) return
        const chunkStart = ttsChunkPlainStartsRef.current[chunkIndex] ?? 0
        const ci = typeof ev.charIndex === 'number' ? ev.charIndex : 0
        const inChunk = Math.max(0, Math.min(ci, text.length))
        const target = chunkStart + inChunk
        const clampedTarget = Math.min(Math.max(0, plainLen - 1), target)

        const lagMs = prefersReducedMotionReadAlong() ? 0 : getReadAlongBoundaryUiLagMs()

        const applyBoundaryUi = () => {
          if (birthGen !== ttsCancelGenerationRef.current) return
          if (!ttsActiveRef.current) return
          if (typeof window !== 'undefined' && window.speechSynthesis.paused) return
          if (ttsChunkIndexRef.current !== chunkIndex) return

          const wr = currentWordRangeInChunk(text, ev)
          const progressPlain = wr
            ? Math.min(Math.max(0, plainLen - 1), chunkStart + wr.relStart)
            : clampedTarget
          recordReadAlongProgressPlainOffset(progressPlain)

          if (prefersReducedMotionReadAlong()) {
            scheduleReadAlongUi({ scroll: progressPlain, scrollBehavior: 'auto' })
            return
          }

          if (wr) {
            const plainWordStart = chunkStart + wr.relStart
            const plainWordEnd = chunkStart + wr.relEndExclusive
            const scrollMid = Math.min(
              Math.max(0, plainLen - 1),
              chunkStart + Math.floor((wr.relStart + wr.relEndExclusive - 1) / 2)
            )
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
      }

      u.onend = () => {
        if (birthGen !== ttsCancelGenerationRef.current) return
        memorizeListenTtsRateAtStartRef.current = null
        bumpListen()
        speakChunkInternalRef.current(chunkIndex + 1)
      }
      u.onerror = () => {
        if (birthGen !== ttsCancelGenerationRef.current) return
        ttsActiveRef.current = false
        ttsChunkIndexRef.current = 0
        memorizeListenTtsRateAtStartRef.current = null
        clearReadAlongSession()
        bumpListen()
      }

      syn.speak(u)
      bumpListen()
    },
    [
      androidHost,
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
    (fromBeginning: boolean) => {
      if (androidHost) return
      if (typeof window === 'undefined' || !window.speechSynthesis) return

      const resolvedScroll = resolveListenScopeAndText()
      if (!resolvedScroll) return

      let resolved = resolvedScroll
      const slug = profileSlugRef.current

      if (!fromBeginning && slug) {
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
              const text = plainTextForProfileResourceListen(el)
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

      const syn = window.speechSynthesis
      syn.cancel()
      cancelReadAlongUiScheduling()
      readAlongHighlightPaintRef.current = null
      if (typeof document !== 'undefined') clearReadAlongDomHighlight(document)
      ttsCancelGenerationRef.current += 1

      const chunkMeta = splitTextForTtsChunksWithOffsets(resolved.text)
      if (chunkMeta.length === 0) return

      let startChunk = 0
      lastPersistedPlainOffsetRef.current = 0
      if (!fromBeginning && slug) {
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
      ttsChunksRef.current = chunkMeta.map((c) => c.text)
      ttsActiveRef.current = true
      speakChunkInternal(startChunk)
    },
    [androidHost, cancelReadAlongUiScheduling, resolveListenScopeAndText, speakChunkInternal]
  )

  const restartReadAloudFromBeginning = useCallback(() => {
    if (androidHost) return
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current)
      persistTimerRef.current = null
    }
    const slug = profileSlugRef.current
    if (slug && typeof document !== 'undefined') {
      const r = resolveListenScopeAndText()
      if (r) {
        clearProfileReadAlongProgress(slug, r.scope.id)
        saveProfileReadAlongLastSession(slug, r.scope.id, 0, readAlongTextFingerprint(r.text))
      }
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    ttsCancelGenerationRef.current += 1
    cancelReadAlongUiScheduling()
    clearReadAlongSession()
    startReadAloudSession(true)
  }, [
    androidHost,
    cancelReadAlongUiScheduling,
    clearReadAlongSession,
    resolveListenScopeAndText,
    startReadAloudSession,
  ])

  const handlePrimaryClick = useCallback(() => {
    if (androidHost) return
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      onNothingToRead?.('Listen is not supported in this browser.')
      return
    }
    const syn = window.speechSynthesis

    if (syn.speaking) {
      if (syn.paused) {
        memorizeListenTtsUserPausedRef.current = false
        const atStart = memorizeListenTtsRateAtStartRef.current
        if (atStart != null && listenPlaybackRateRef.current !== atStart) {
          ttsCancelGenerationRef.current += 1
          syn.cancel()
          memorizeListenTtsRateAtStartRef.current = null
          memorizeListenTtsPostResumeRef.current = false
          speakChunkInternalRef.current(ttsChunkIndexRef.current)
        } else {
          memorizeListenTtsPostResumeRef.current = true
          syn.resume()
          window.setTimeout(bumpListen, 24)
          window.setTimeout(bumpListen, 72)
        }
      } else {
        memorizeListenTtsUserPausedRef.current = true
        memorizeListenTtsPostResumeRef.current = false
        syn.pause()
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
    androidHost,
    bumpListen,
    flushReadAlongProgressPersist,
    onNothingToRead,
    startReadAloudSession,
  ])

  const listenButtonLabel = useMemo(() => {
    void listenUiTick
    if (androidHost) return 'Play'
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return 'Play'
    const syn = window.speechSynthesis
    if (memorizeListenTtsUserPausedRef.current) return 'Play'
    if (memorizeListenTtsPostResumeRef.current && syn.speaking) return 'Pause'
    if (syn.speaking && !syn.paused) return 'Pause'
    return 'Play'
  }, [listenUiTick, androidHost])

  const listenAriaPressed = useMemo(() => {
    void listenUiTick
    if (androidHost) return false
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false
    const syn = window.speechSynthesis
    if (memorizeListenTtsUserPausedRef.current) return false
    if (memorizeListenTtsPostResumeRef.current && syn.speaking) return true
    return syn.speaking && !syn.paused
  }, [listenUiTick, androidHost])

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

      if (androidHost || !ttsActiveRef.current) return
      const syn = window.speechSynthesis
      /** Paused: wait for Resume so we don't unpause by surprise (refs already updated). */
      if (!syn.speaking || syn.paused) return

      const i = ttsChunkIndexRef.current
      ttsCancelGenerationRef.current += 1
      syn.cancel()
      memorizeListenTtsUserPausedRef.current = false
      memorizeListenTtsPostResumeRef.current = false
      queueMicrotask(() => speakChunkInternalRef.current(i))
    },
    [androidHost, bumpListen]
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
    readAlongUnderlineOn,
    toggleReadAlongUnderline,
    readAlongUnderlineStyle,
    setReadAlongUnderlineStyle,
  }
}
