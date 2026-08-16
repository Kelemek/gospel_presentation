'use client'

import { startTransition, useCallback, useEffect, useLayoutEffect, useMemo } from 'react'
import type { MutableRefObject } from 'react'
import { pickRandomAllDoneMessage, pickRandomRoundAffirmation } from '@/lib/memorizationEncouragementMessages'
import {
  MEMORIZATION_FULL_HIDE_ROUND,
  buildInitialReorderSlotAssignment,
  pickReorderMovableIndices,
  seedRandom,
  stringToSeed,
} from '@/lib/memorizationPracticeUtils'
import {
  getMemorizationRoundCompleteInstruction,
  memorizationRoundAdvanceShowsFinishPractice,
  memorizationRoundAdvanceShowsNextRound,
  memorizationRoundAdvanceShowsStrictErrorsBadge,
  shouldAutoCompleteFinalRound,
  shouldBlockFinishPractice,
} from '@/lib/memorizationRoundAdvancePolicy'
import {
  isPracticePhaseActiveRound,
  isPracticePhaseRoundComplete,
  practicePhaseHadErrors,
} from '@/lib/memorizationPracticePhase'
import { isRecitePracticeMode } from '@/lib/memorizationReciteIntegration'
import type { MemorizationRecitePracticeHandle } from '@/lib/memorizationRecitePracticeTypes'
import type { MemorizationInProgressSavePayload, MemorizationPracticeMode } from '@/lib/verseMemorizationStorage'
import type { MemorizationPracticePhase } from '@/lib/memorizationPracticePhase'
import {
  ANDROID_SCROLL_CLAMP_MS,
  hiddenTypingTokenIndices,
} from '@/lib/memorizationPracticeSessionHelpers'

type UseMemorizationPracticeRoundRuntimeOptions = {
  verseId: string
  reorderChunks: { length: number }
  typableIndices: number[]
  memorizeAndroidHost: boolean
  phase: MemorizationPracticePhase
  phaseRef: MutableRefObject<MemorizationPracticePhase>
  practiceMode: MemorizationPracticeMode | null
  practiceModeRef: MutableRefObject<MemorizationPracticeMode | null>
  strictMode: boolean
  strictModeRef: MutableRefObject<boolean>
  roundIndex: number
  isRoundComplete: boolean
  isActiveRound: boolean
  wrongAttemptsInRound: number
  wrongAttemptsInRoundRef: MutableRefObject<number>
  hiddenIndices: Set<number>
  revealed: Set<number>
  reorderSlotChunkIds: number[]
  roundAdvanceHandledRef: MutableRefObject<number | null>
  sessionSeedRef: MutableRefObject<string>
  completedRef: MutableRefObject<boolean>
  androidScrollClampUntilRef: MutableRefObject<number>
  recitePracticeRef: MutableRefObject<MemorizationRecitePracticeHandle | null>
  hasOnPersistInProgress: boolean
  persistPracticeSnapshotRef: MutableRefObject<
    (
      phasePayload: MemorizationInProgressSavePayload['phase'],
      options?: { wrongAttemptsInRound?: number }
    ) => void
  >
  finishPracticeSessionRef: MutableRefObject<() => void>
  onRoundCompleteRef: MutableRefObject<() => void>
  startActiveRound: (round: number) => void
  completeRound: (roundIndex: number, hadErrors: boolean) => void
  finishPracticePhase: (message: string) => void
  onComplete: (result: {
    wrongAttempts: number
    correctKeystrokes: number
    completed: boolean
  }) => void
  wrongAttemptsRef: MutableRefObject<number>
  correctKeystrokesRef: MutableRefObject<number>
  resetRoundUiState: (options?: { clearCompletedWithErrors?: boolean }) => void
  setHiddenIndices: (v: Set<number> | ((p: Set<number>) => Set<number>)) => void
  setReorderSlotChunkIds: (v: number[] | ((p: number[]) => number[])) => void
  setReorderRoundMovableIndices: (v: Set<number> | ((p: Set<number>) => Set<number>)) => void
  setRoundAffirmation: (v: string | ((p: string) => string)) => void
  stopPassageAudio: () => void
}

export function useMemorizationPracticeRoundRuntime(options: UseMemorizationPracticeRoundRuntimeOptions) {
  const {
    verseId,
    reorderChunks,
    typableIndices,
    memorizeAndroidHost,
    phase,
    phaseRef,
    practiceMode,
    practiceModeRef,
    strictMode,
    strictModeRef,
    roundIndex,
    isRoundComplete,
    isActiveRound,
    wrongAttemptsInRound,
    wrongAttemptsInRoundRef,
    hiddenIndices,
    revealed,
    reorderSlotChunkIds,
    roundAdvanceHandledRef,
    sessionSeedRef,
    completedRef,
    androidScrollClampUntilRef,
    recitePracticeRef,
    hasOnPersistInProgress,
    persistPracticeSnapshotRef,
    finishPracticeSessionRef,
    onRoundCompleteRef,
    startActiveRound,
    completeRound,
    finishPracticePhase,
    onComplete,
    wrongAttemptsRef,
    correctKeystrokesRef,
    resetRoundUiState,
    setHiddenIndices,
    setReorderSlotChunkIds,
    setReorderRoundMovableIndices,
    setRoundAffirmation,
    stopPassageAudio,
  } = options

  const isFinalRound = roundIndex >= MEMORIZATION_FULL_HIDE_ROUND

  const showNextRoundOption = useMemo(
    () =>
      memorizationRoundAdvanceShowsNextRound({
        isFinalRound,
        roundCompletedWithErrors: practicePhaseHadErrors(phase),
        strictMode,
        wrongAttemptsInRound,
      }),
    [isFinalRound, phase, strictMode, wrongAttemptsInRound]
  )

  const showFinishPracticeOption = useMemo(
    () =>
      memorizationRoundAdvanceShowsFinishPractice({
        isRoundComplete,
        isFinalRound,
        strictMode,
      }),
    [isRoundComplete, isFinalRound, strictMode]
  )

  const showStrictErrorsBadge = useMemo(
    () =>
      memorizationRoundAdvanceShowsStrictErrorsBadge({
        strictMode,
        wrongAttemptsInRound,
        isActiveRound,
      }),
    [strictMode, wrongAttemptsInRound, isActiveRound]
  )

  const roundCompleteInstruction = useMemo(() => {
    if (!isRoundComplete) return null
    return getMemorizationRoundCompleteInstruction({
      isFinalRound,
      showFinishPracticeOption,
      roundIndex,
    })
  }, [isRoundComplete, isFinalRound, showFinishPracticeOption, roundIndex])

  const reciteRoundAdvanceHeaderCopy = useMemo(() => {
    if (!isRoundComplete || practiceMode !== 'recite') return ''
    if (isFinalRound) {
      if (showFinishPracticeOption) {
        return `Round ${roundIndex} complete — repeat this round or finish practice.`
      }
      return `Round ${roundIndex} complete — repeat this round until you finish with no errors.`
    }
    return `Round ${roundIndex} complete — repeat or continue to round ${roundIndex + 1}.`
  }, [isRoundComplete, practiceMode, isFinalRound, showFinishPracticeOption, roundIndex])

  const finishPracticeSessionStable = useCallback(() => {
    if (
      shouldBlockFinishPractice(
        isPracticePhaseRoundComplete(phaseRef.current),
        roundIndex >= MEMORIZATION_FULL_HIDE_ROUND,
        strictModeRef.current
      )
    ) {
      return
    }
    if (completedRef.current) return
    completedRef.current = true
    onComplete({
      wrongAttempts: wrongAttemptsRef.current,
      correctKeystrokes: correctKeystrokesRef.current,
      completed: true,
    })
    startTransition(() => {
      finishPracticePhase(pickRandomAllDoneMessage())
    })
  }, [
    completedRef,
    correctKeystrokesRef,
    finishPracticePhase,
    onComplete,
    phaseRef,
    roundIndex,
    strictModeRef,
    wrongAttemptsRef,
  ])

  const startRound = useCallback(
    (r: number) => {
      roundAdvanceHandledRef.current = null
      const seed = sessionSeedRef.current || verseId
      const mode = practiceModeRef.current
      if (memorizeAndroidHost) {
        androidScrollClampUntilRef.current = Date.now() + ANDROID_SCROLL_CLAMP_MS
      }
      resetRoundUiState({ clearCompletedWithErrors: mode !== 'reorder' })

      if (mode === 'reorder') {
        const n = reorderChunks.length
        const movableArr = pickReorderMovableIndices(n, r, seed)
        const rng = seedRandom(stringToSeed(`${seed}-mem-reorder-assign-r${r}`))
        const assignment = buildInitialReorderSlotAssignment(n, movableArr, rng)
        setReorderSlotChunkIds(assignment)
        setReorderRoundMovableIndices(new Set(movableArr))
        setHiddenIndices(new Set())
        startActiveRound(r)
        return
      }

      const hidden = hiddenTypingTokenIndices(mode, r, seed, typableIndices)
      setHiddenIndices(hidden)
      if (isRecitePracticeMode(mode)) {
        recitePracticeRef.current?.resetAttemptState()
      }
      startActiveRound(r)
    },
    [
      androidScrollClampUntilRef,
      memorizeAndroidHost,
      practiceModeRef,
      recitePracticeRef,
      reorderChunks,
      resetRoundUiState,
      roundAdvanceHandledRef,
      sessionSeedRef,
      setHiddenIndices,
      setReorderRoundMovableIndices,
      setReorderSlotChunkIds,
      startActiveRound,
      typableIndices,
      verseId,
    ]
  )

  const onRoundComplete = useCallback(() => {
    if (isFinalRound && shouldAutoCompleteFinalRound(wrongAttemptsInRoundRef.current)) {
      finishPracticeSessionStable()
      return
    }

    if (roundAdvanceHandledRef.current === roundIndex) return
    roundAdvanceHandledRef.current = roundIndex
    const hadErrors = wrongAttemptsInRoundRef.current > 0
    completeRound(roundIndex, hadErrors)
    if (hasOnPersistInProgress && sessionSeedRef.current) {
      persistPracticeSnapshotRef.current(
        { kind: 'betweenRounds', completedRoundIndex: roundIndex },
        { wrongAttemptsInRound: wrongAttemptsInRoundRef.current }
      )
    }
    startTransition(() => {
      setRoundAffirmation(pickRandomRoundAffirmation())
    })
    stopPassageAudio()
  }, [
    completeRound,
    finishPracticeSessionStable,
    isFinalRound,
    hasOnPersistInProgress,
    persistPracticeSnapshotRef,
    roundAdvanceHandledRef,
    roundIndex,
    sessionSeedRef,
    setRoundAffirmation,
    stopPassageAudio,
    wrongAttemptsInRoundRef,
  ])

  useLayoutEffect(() => {
    onRoundCompleteRef.current = onRoundComplete
    finishPracticeSessionRef.current = finishPracticeSessionStable
  }, [onRoundComplete, onRoundCompleteRef, finishPracticeSessionStable, finishPracticeSessionRef])

  useEffect(() => {
    if (!isPracticePhaseActiveRound(phase)) return
    if (practiceMode === 'recite') return

    if (practiceMode === 'reorder') {
      const n = reorderChunks.length
      if (n === 0 || reorderSlotChunkIds.length !== n) return
      if (!reorderSlotChunkIds.every((id, i) => id === i)) return
      onRoundComplete()
      return
    }

    if (hiddenIndices.size === 0) return
    const allDone = [...hiddenIndices].every((i) => revealed.has(i))
    if (!allDone) return
    onRoundComplete()
  }, [
    phase,
    isRoundComplete,
    practiceMode,
    reorderChunks,
    reorderSlotChunkIds,
    hiddenIndices,
    revealed,
    onRoundComplete,
    roundIndex,
  ])

  return {
    isFinalRound,
    showNextRoundOption,
    showFinishPracticeOption,
    showStrictErrorsBadge,
    roundCompleteInstruction,
    reciteRoundAdvanceHeaderCopy,
    startRound,
    onRoundComplete,
    finishPracticeSession: finishPracticeSessionStable,
  }
}
