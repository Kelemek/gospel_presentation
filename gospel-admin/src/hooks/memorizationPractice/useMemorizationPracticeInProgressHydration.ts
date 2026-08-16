'use client'

import type { MemorizedVerse } from '@/lib/verseMemorizationStorage'
import type { MemorizationPracticeCoreState } from '@/hooks/memorizationPractice/useMemorizationPracticeCoreState'
import {
  buildInitialReorderSlotAssignment,
  pickReorderMovableIndices,
  seedRandom,
  stringToSeed,
} from '@/lib/memorizationPracticeUtils'
import {
  ANDROID_SCROLL_CLAMP_MS,
  hiddenTypingTokenIndices,
  isKeyboardPracticeMode,
} from '@/lib/memorizationPracticeSessionHelpers'
import { startTransition, useLayoutEffect, useRef } from 'react'
import { pickRandomRoundAffirmation } from '@/lib/memorizationEncouragementMessages'
import { isMemorizeAndroidWebHost } from '@/lib/memorizationViewportPlatform'

export type MemorizationPracticeInProgressHydrationOptions = {
  verse: MemorizedVerse
  reorderChunks: { length: number }
  typableIndices: number[]
  memorizeAndroidHost: boolean
  core: MemorizationPracticeCoreState
  hydrateRoundComplete: (roundIndex: number, hadErrors: boolean) => void
  hydrateActiveRound: (roundIndex: number) => void
}

/** Restore in-progress practice once per verse open (localStorage resume). */
export function useMemorizationPracticeInProgressHydration({
  verse,
  reorderChunks,
  typableIndices,
  memorizeAndroidHost,
  core,
  hydrateRoundComplete,
  hydrateActiveRound,
}: MemorizationPracticeInProgressHydrationOptions) {
  const {
    sessionSeedRef,
    completedRef,
    roundAdvanceHandledRef,
    androidScrollClampUntilRef,
    practiceScrollRef,
    practiceInputRef,
    openedLayoutOnceForVerseIdRef,
    lastVerseIdForLayoutRef,
    hydrateRoundErrors,
    setWrongAttemptsTotal,
    setCorrectKeystrokesTotal,
    setHasTypedInRound,
    setHiddenIndices,
    setRevealed,
    setFirstLetterCueRevealedSlots,
    setReorderSlotChunkIds,
    setReorderRoundMovableIndices,
    setConsecutiveWrong,
    setRoundAffirmation,
    setPracticeMode,
  } = core
  useLayoutEffect(() => {
    if (lastVerseIdForLayoutRef.current !== verse.id) {
      lastVerseIdForLayoutRef.current = verse.id
      openedLayoutOnceForVerseIdRef.current = null
    }
    if (openedLayoutOnceForVerseIdRef.current === verse.id) return
    openedLayoutOnceForVerseIdRef.current = verse.id

    const ip = verse.inProgressPractice
    if (!ip) return

    sessionSeedRef.current = ip.sessionSeed
    completedRef.current = false

    if (ip.phase.kind === 'betweenRounds') {
      const r = ip.phase.completedRoundIndex
      roundAdvanceHandledRef.current = r
      const hydratedRoundErrors = ip.wrongAttemptsInRound ?? 0
      hydrateRoundErrors(hydratedRoundErrors)
      const seed = sessionSeedRef.current || verse.id
      const modeRaw = ip.practiceMode ?? 'type'
      if (modeRaw === 'reorder') {
        const n = reorderChunks.length
        const identitySlots = n === 0 ? [] : Array.from({ length: n }, (_, i) => i)
        startTransition(() => {
          setWrongAttemptsTotal(ip.wrongAttempts)
          setCorrectKeystrokesTotal(ip.correctKeystrokes)
          setHasTypedInRound(false)
          setHiddenIndices(new Set())
          setRevealed(new Set())
          setFirstLetterCueRevealedSlots(new Set())
          setReorderSlotChunkIds(identitySlots)
          setReorderRoundMovableIndices(new Set())
          setConsecutiveWrong(0)
          setRoundAffirmation(pickRandomRoundAffirmation())
          hydrateRoundComplete(r, hydratedRoundErrors > 0)
          setPracticeMode('reorder')
        })
      } else {
        const hidden = hiddenTypingTokenIndices(modeRaw, r, seed, typableIndices)
        startTransition(() => {
          setWrongAttemptsTotal(ip.wrongAttempts)
          setCorrectKeystrokesTotal(ip.correctKeystrokes)
          setHasTypedInRound(false)
          setHiddenIndices(hidden)
          setRevealed(new Set())
          setFirstLetterCueRevealedSlots(new Set())
          setConsecutiveWrong(0)
          setRoundAffirmation(pickRandomRoundAffirmation())
          hydrateRoundComplete(r, hydratedRoundErrors > 0)
          setPracticeMode(modeRaw)
        })
      }
    } else {
      roundAdvanceHandledRef.current = null
      const r = ip.phase.roundIndex
      const hydratedRoundErrors = ip.wrongAttemptsInRound ?? 0
      hydrateRoundErrors(hydratedRoundErrors)
      const modeRaw = ip.practiceMode ?? 'type'
      if (modeRaw === 'reorder') {
        const seed = sessionSeedRef.current
        const n = reorderChunks.length
        const movableArr = pickReorderMovableIndices(n, r, seed)
        const rng = seedRandom(stringToSeed(`${seed}-mem-reorder-assign-r${r}`))
        const assignment = buildInitialReorderSlotAssignment(n, movableArr, rng)
        if (memorizeAndroidHost) {
          androidScrollClampUntilRef.current = Date.now() + ANDROID_SCROLL_CLAMP_MS
        }
        startTransition(() => {
          setWrongAttemptsTotal(ip.wrongAttempts)
          setCorrectKeystrokesTotal(ip.correctKeystrokes)
          setHasTypedInRound(false)
          setReorderSlotChunkIds(assignment)
          setReorderRoundMovableIndices(new Set(movableArr))
          setHiddenIndices(new Set())
          setRevealed(new Set())
          setFirstLetterCueRevealedSlots(new Set())
          setConsecutiveWrong(0)
          setRoundAffirmation('')
          hydrateActiveRound(r)
          setPracticeMode('reorder')
        })
      } else {
        const hidden = hiddenTypingTokenIndices(
          modeRaw,
          r,
          sessionSeedRef.current || verse.id,
          typableIndices
        )
        if (memorizeAndroidHost) {
          androidScrollClampUntilRef.current = Date.now() + ANDROID_SCROLL_CLAMP_MS
        }
        startTransition(() => {
          setWrongAttemptsTotal(ip.wrongAttempts)
          setCorrectKeystrokesTotal(ip.correctKeystrokes)
          setHasTypedInRound(false)
          setHiddenIndices(hidden)
          setRevealed(new Set())
          setFirstLetterCueRevealedSlots(new Set())
          setConsecutiveWrong(0)
          setRoundAffirmation('')
          hydrateActiveRound(r)
          setPracticeMode(modeRaw)
        })
      }
    }
    requestAnimationFrame(() => {
      if (isMemorizeAndroidWebHost() && practiceScrollRef.current) {
        practiceScrollRef.current.scrollTop = 0
      }
      if (isKeyboardPracticeMode(ip.practiceMode ?? 'type')) {
        practiceInputRef.current?.focus({ preventScroll: true })
      }
    })
  }, [
    memorizeAndroidHost,
    reorderChunks,
    verse.id,
    verse.inProgressPractice,
    typableIndices,
    hydrateRoundErrors,
    hydrateRoundComplete,
    hydrateActiveRound,
    sessionSeedRef,
    completedRef,
    roundAdvanceHandledRef,
    androidScrollClampUntilRef,
    practiceScrollRef,
    practiceInputRef,
    openedLayoutOnceForVerseIdRef,
    lastVerseIdForLayoutRef,
    setWrongAttemptsTotal,
    setCorrectKeystrokesTotal,
    setHasTypedInRound,
    setHiddenIndices,
    setRevealed,
    setFirstLetterCueRevealedSlots,
    setReorderSlotChunkIds,
    setReorderRoundMovableIndices,
    setConsecutiveWrong,
    setRoundAffirmation,
    setPracticeMode,
  ])
}

export function useMemorizationPracticeHydrationRefs(verseId: string) {
  const openedLayoutOnceForVerseIdRef = useRef<string | null>(null)
  const lastVerseIdForLayoutRef = useRef(verseId)
  return { openedLayoutOnceForVerseIdRef, lastVerseIdForLayoutRef }
}
