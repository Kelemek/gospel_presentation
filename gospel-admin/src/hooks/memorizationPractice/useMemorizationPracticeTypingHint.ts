'use client'
/* eslint-disable react-hooks/refs -- Session seed ref drives first-letter cue slots. */
 

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type RefObject,
} from 'react'
import {
  pickHiddenCueTypableSlotIndices,
} from '@/lib/memorizationPracticeUtils'
import {
  isPracticePhaseActiveRound,
  isPracticePhaseInSession,
} from '@/lib/memorizationPracticePhase'
import {
  MEMORIZE_HINT_EXTRA_PEEK_INTERVAL_MS,
  scrollActiveFirstLetterCueIntoView,
} from '@/lib/memorizationPracticeSessionHelpers'
import type { MemorizationPracticeTypingBag } from '@/hooks/memorizationPractice/memorizationPracticeTypingBag'
import type { MemorizationToken } from '@/lib/memorizationPracticeUtils'

export type MemorizationPracticeTypingHintState = {
  hintActive: boolean
  hintPeekIndices: Set<number>
  currentTargetIndex: number | null
  currentTargetToken: MemorizationToken | null
  firstLetterCueHiddenSlots: Set<number>
  firstLetterCueHiddenSlotsRef: RefObject<Set<number>>
}

export function useMemorizationPracticeTypingHint(
  bag: MemorizationPracticeTypingBag
): MemorizationPracticeTypingHintState {
  const {
    verse,
    verseModel,
    phase,
    practiceMode,
    roundIndex,
    isRoundComplete,
    hiddenIndices,
    revealed,
    firstLetterCueRevealedSlots,
    hintHeld,
    hintPeekCount,
    setHintPeekCount,
    sessionSeedRef,
    firstLetterCuesViewportRef,
  } = bag
  const { tokens, typableIndices } = verseModel

  const hintActive = hintHeld && isPracticePhaseInSession(phase)

  const hiddenSorted = useMemo(() => [...hiddenIndices].sort((a, b) => a - b), [hiddenIndices])

  const unrevealedHiddenSorted = useMemo(
    () => hiddenSorted.filter((i) => !revealed.has(i)),
    [hiddenSorted, revealed]
  )

  const unrevealedLenRef = useRef(0)
  useEffect(() => {
    unrevealedLenRef.current = unrevealedHiddenSorted.length
  }, [unrevealedHiddenSorted])

  const hintPeekIndices = useMemo(() => {
    if (!hintActive) return new Set<number>()
    return new Set(unrevealedHiddenSorted.slice(0, hintPeekCount))
  }, [hintActive, unrevealedHiddenSorted, hintPeekCount])

  useEffect(() => {
    if (!hintActive) return
    if (practiceMode === 'reorder') return
    const id = window.setInterval(() => {
      setHintPeekCount((c) => Math.min(c + 1, unrevealedLenRef.current))
    }, MEMORIZE_HINT_EXTRA_PEEK_INTERVAL_MS)
    return () => {
      window.clearInterval(id)
    }
  }, [hintActive, practiceMode, setHintPeekCount])

  const currentTargetIndex = useMemo(() => {
    for (const idx of hiddenSorted) {
      if (!revealed.has(idx)) return idx
    }
    return null
  }, [hiddenSorted, revealed])

  const currentTargetToken =
    currentTargetIndex !== null ? (tokens[currentTargetIndex] ?? null) : null

  const firstLetterCueHiddenSlots = useMemo(() => {
    if (practiceMode !== 'firstLetters' || !isPracticePhaseInSession(phase)) return new Set<number>()
    const seed = sessionSeedRef.current || verse.id
    return pickHiddenCueTypableSlotIndices(typableIndices.length, roundIndex, seed)
  }, [practiceMode, phase, typableIndices.length, roundIndex, verse.id, sessionSeedRef])

  const firstLetterCueHiddenSlotsRef = useRef(firstLetterCueHiddenSlots)
  useLayoutEffect(() => {
    firstLetterCueHiddenSlotsRef.current = firstLetterCueHiddenSlots
  }, [firstLetterCueHiddenSlots])

  useLayoutEffect(() => {
    if (practiceMode !== 'firstLetters' || !isPracticePhaseActiveRound(phase)) return
    scrollActiveFirstLetterCueIntoView(
      firstLetterCuesViewportRef.current,
      currentTargetIndex,
      typableIndices
    )
  }, [
    practiceMode,
    phase,
    isRoundComplete,
    currentTargetIndex,
    typableIndices,
    roundIndex,
    firstLetterCueHiddenSlots,
    firstLetterCueRevealedSlots,
    tokens,
    firstLetterCuesViewportRef,
  ])

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return
    if (practiceMode !== 'firstLetters' || !isPracticePhaseActiveRound(phase)) return
    const root = firstLetterCuesViewportRef.current
    if (!root) return
    let raf = 0
    const schedule = () => {
      if (raf) window.cancelAnimationFrame(raf)
      raf = window.requestAnimationFrame(() => {
        raf = 0
        if (!root.isConnected) return
        scrollActiveFirstLetterCueIntoView(root, currentTargetIndex, typableIndices)
      })
    }
    const ro = new ResizeObserver(schedule)
    ro.observe(root)
    return () => {
      ro.disconnect()
      if (raf) window.cancelAnimationFrame(raf)
    }
  }, [
    practiceMode,
    phase,
    isRoundComplete,
    currentTargetIndex,
    typableIndices,
    firstLetterCuesViewportRef,
  ])

  return {
    hintActive,
    hintPeekIndices,
    currentTargetIndex,
    currentTargetToken,
    firstLetterCueHiddenSlots,
    firstLetterCueHiddenSlotsRef,
  }
}
