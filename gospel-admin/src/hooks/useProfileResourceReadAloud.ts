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
import { splitTextForTtsChunksWithOffsets } from '@/lib/splitTextForTtsChunks'
import {
  clearReadAlongDomHighlight,
  updateReadAlongDomHighlight,
} from '@/lib/profileReadAlongDomHighlight'
import {
  currentWordRangeInChunk,
  firstWordRangeInChunk,
} from '@/lib/readAlongSpeechWordRange'
import {
  prefersReducedMotionReadAlong,
  scrollReadAlongPlainOffsetIntoViewCenter,
} from '@/lib/scrollReadAlongPlain'

export interface UseProfileResourceReadAloudOptions {
  sections: GospelSection[]
  /** Optional alert when there is nothing to read or the anchor is missing */
  onNothingToRead?: (message: string) => void
}

export function useProfileResourceReadAloud({
  sections,
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
  /** Last painted highlight range for scroll/resize refresh */
  const readAlongHighlightPlainRef = useRef<{ start: number; endExclusive: number } | null>(null)
  const readAlongPendingUiRef = useRef<{
    scroll?: number
    highlight?: { start: number; endExclusive: number } | null
  }>({})
  const readAlongUiRafRef = useRef(0)

  const androidHost = useMemo(() => isMemorizeAndroidWebHost(), [])

  const bumpListen = useCallback(() => {
    setListenUiTick((t) => t + 1)
  }, [])

  const cancelReadAlongUiScheduling = useCallback(() => {
    if (readAlongUiRafRef.current !== 0) {
      cancelAnimationFrame(readAlongUiRafRef.current)
      readAlongUiRafRef.current = 0
    }
    readAlongPendingUiRef.current = {}
  }, [])

  const scheduleReadAlongUi = useCallback(
    (patch: { scroll?: number; highlight?: { start: number; endExclusive: number } | null }) => {
      const acc = readAlongPendingUiRef.current
      if (patch.scroll !== undefined) acc.scroll = patch.scroll
      if (patch.highlight !== undefined) acc.highlight = patch.highlight

      if (readAlongUiRafRef.current !== 0) return
      readAlongUiRafRef.current = requestAnimationFrame(() => {
        readAlongUiRafRef.current = 0
        const pending = readAlongPendingUiRef.current
        readAlongPendingUiRef.current = {}

        const scope = readAlongScopeRef.current
        const plainLen = readAlongPlainLenRef.current

        if (pending.scroll !== undefined && scope && plainLen > 0) {
          const behavior: ScrollBehavior = prefersReducedMotionReadAlong() ? 'auto' : 'smooth'
          scrollReadAlongPlainOffsetIntoViewCenter(scope, plainLen, pending.scroll, behavior)
        }

        if (pending.highlight !== undefined) {
          if (pending.highlight === null) {
            readAlongHighlightPlainRef.current = null
            if (typeof document !== 'undefined') clearReadAlongDomHighlight(document)
          } else if (scope && plainLen > 0) {
            const { start, endExclusive } = pending.highlight
            readAlongHighlightPlainRef.current = pending.highlight
            if (endExclusive > start) {
              updateReadAlongDomHighlight({
                scope,
                plainCollapsedLen: plainLen,
                plainStart: start,
                plainEndExclusive: endExclusive,
              })
            }
          }
        }
      })
    },
    []
  )

  const clearReadAlongSession = useCallback(() => {
    cancelReadAlongUiScheduling()
    readAlongHighlightPlainRef.current = null
    if (typeof document !== 'undefined') clearReadAlongDomHighlight(document)
    readAlongScopeRef.current = null
    readAlongPlainLenRef.current = 0
    ttsChunkPlainStartsRef.current = []
  }, [cancelReadAlongUiScheduling])

  useEffect(() => {
    if (typeof window === 'undefined') return
    let raf = 0
    const onViewportChange = () => {
      if (raf !== 0) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const hl = readAlongHighlightPlainRef.current
        const scope = readAlongScopeRef.current
        const plainLen = readAlongPlainLenRef.current
        if (!hl || !scope || plainLen <= 0 || hl.endExclusive <= hl.start) return
        updateReadAlongDomHighlight({
          scope,
          plainCollapsedLen: plainLen,
          plainStart: hl.start,
          plainEndExclusive: hl.endExclusive,
        })
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
    return () => {
      cancelReadAlongUiScheduling()
      if (typeof document !== 'undefined') clearReadAlongDomHighlight(document)
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [cancelReadAlongUiScheduling])

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
        ttsActiveRef.current = false
        ttsChunkIndexRef.current = 0
        memorizeListenTtsRateAtStartRef.current = null
        clearReadAlongSession()
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
        if (!scope || plainLen <= 0) return

        if (prefersReducedMotionReadAlong()) {
          scheduleReadAlongUi({
            scroll: chunkStart,
            highlight: {
              start: chunkStart,
              endExclusive: chunkStart + text.length,
            },
          })
          return
        }

        const fw = firstWordRangeInChunk(text)
        if (fw) {
          const plainWordStart = chunkStart + fw.relStart
          const plainWordEnd = chunkStart + fw.relEndExclusive
          const mid = Math.floor((plainWordStart + plainWordEnd - 1) / 2)
          const plainOffset = Math.min(Math.max(0, plainLen - 1), Math.max(chunkStart, mid))
          scheduleReadAlongUi({
            scroll: plainOffset,
            highlight: { start: plainWordStart, endExclusive: plainWordEnd },
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
        const plainOffsetScrollOnly = Math.min(Math.max(0, plainLen - 1), target)

        if (prefersReducedMotionReadAlong()) {
          scheduleReadAlongUi({ scroll: plainOffsetScrollOnly })
          return
        }

        const wr = currentWordRangeInChunk(text, ev)
        if (wr) {
          const plainWordStart = chunkStart + wr.relStart
          const plainWordEnd = chunkStart + wr.relEndExclusive
          const mid = Math.floor((plainWordStart + plainWordEnd - 1) / 2)
          const plainOffset = Math.min(Math.max(0, plainLen - 1), Math.max(chunkStart, mid))
          scheduleReadAlongUi({
            scroll: plainOffset,
            highlight: { start: plainWordStart, endExclusive: plainWordEnd },
          })
        } else {
          scheduleReadAlongUi({ scroll: plainOffsetScrollOnly })
        }
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
    [androidHost, bumpListen, clearReadAlongSession, scheduleReadAlongUi]
  )

  useLayoutEffect(() => {
    listenPlaybackRateRef.current = listenPlaybackRate
  }, [listenPlaybackRate])

  useLayoutEffect(() => {
    speakChunkInternalRef.current = speakChunkInternal
  }, [speakChunkInternal])

  const beginTtsUtterance = useCallback(() => {
    if (androidHost) return
    if (typeof window === 'undefined' || !window.speechSynthesis) return

    const resolved = resolveListenScopeAndText()
    if (!resolved) return

    const syn = window.speechSynthesis
    syn.cancel()
    cancelReadAlongUiScheduling()
    readAlongHighlightPlainRef.current = null
    if (typeof document !== 'undefined') clearReadAlongDomHighlight(document)
    ttsCancelGenerationRef.current += 1

    const chunkMeta = splitTextForTtsChunksWithOffsets(resolved.text)
    if (chunkMeta.length === 0) return

    readAlongScopeRef.current = resolved.scope
    readAlongPlainLenRef.current = resolved.text.length
    ttsChunkPlainStartsRef.current = chunkMeta.map((c) => c.plainStart)
    ttsChunksRef.current = chunkMeta.map((c) => c.text)
    ttsActiveRef.current = true
    speakChunkInternal(0)
  }, [
    androidHost,
    cancelReadAlongUiScheduling,
    resolveListenScopeAndText,
    speakChunkInternal,
  ])

  const handlePrimaryClick = useCallback(() => {
    if (androidHost) return
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      onNothingToRead?.('Read aloud is not supported in this browser.')
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
      }
      bumpListen()
      queueMicrotask(bumpListen)
      return
    }

    if (!ttsActiveRef.current) {
      beginTtsUtterance()
    }
    bumpListen()
  }, [
    androidHost,
    beginTtsUtterance,
    bumpListen,
    onNothingToRead,
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
  }
}
