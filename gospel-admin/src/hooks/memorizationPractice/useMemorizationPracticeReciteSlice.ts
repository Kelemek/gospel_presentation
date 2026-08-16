'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import { MEMORIZATION_FULL_HIDE_ROUND } from '@/lib/memorizationPracticeUtils'
import { isPracticePhaseInSession } from '@/lib/memorizationPracticePhase'
import { memorizationRoundAdvanceShowsNextRound } from '@/lib/memorizationRoundAdvancePolicy'
import type {
  MemorizationRecitePracticeHandle,
  ReciteAttemptMetrics,
  RecitePhase,
} from '@/lib/memorizationRecitePracticeTypes'
import type { MemorizationInProgressSavePayload, MemorizationPracticeMode } from '@/lib/verseMemorizationStorage'
import type { MemorizationPracticeReciteSlice } from '@/lib/memorizationPracticeSessionContract'
import type { MemorizationPracticePhase } from '@/lib/memorizationPracticePhase'

type SessionCallbackRefs = {
  startRoundAndFocusInputRef: MutableRefObject<(round: number) => void>
  persistPracticeSnapshotRef: MutableRefObject<
    (
      phasePayload: MemorizationInProgressSavePayload['phase'],
      options?: { wrongAttemptsInRound?: number }
    ) => void
  >
  onRoundCompleteRef: MutableRefObject<() => void>
  finishPracticeSessionRef: MutableRefObject<() => void>
  completedRef: MutableRefObject<boolean>
  wrongAttemptsInRoundRef: MutableRefObject<number>
  strictModeRef: MutableRefObject<boolean>
}

type UseMemorizationPracticeReciteSliceOptions = SessionCallbackRefs & {
  practiceMode: MemorizationPracticeMode | null
  phase: MemorizationPracticePhase
  isRoundComplete: boolean
  roundIndex: number
  recordWrongAttempt: () => void
  setCorrectKeystrokesTotal: (v: number | ((p: number) => number)) => void
  setRoundCompletedWithErrors: (v: boolean) => void
  setHasTypedInRound: (v: boolean | ((p: boolean) => boolean)) => void
  setHintPeekCount: (count: number | ((prev: number) => number)) => void
  setHintHeld: (held: boolean) => void
}

export function useMemorizationPracticeReciteSlice({
  practiceMode,
  phase,
  isRoundComplete,
  roundIndex,
  recordWrongAttempt,
  setCorrectKeystrokesTotal,
  setRoundCompletedWithErrors,
  setHasTypedInRound,
  setHintPeekCount,
  setHintHeld,
  startRoundAndFocusInputRef,
  persistPracticeSnapshotRef,
  onRoundCompleteRef,
  finishPracticeSessionRef,
  completedRef,
  wrongAttemptsInRoundRef,
  strictModeRef,
}: UseMemorizationPracticeReciteSliceOptions): MemorizationPracticeReciteSlice & {
  resetRecitePhase: () => void
  cancelRecitePractice: () => void
  prepareReciteClose: () => Promise<void>
} {
  const recitePracticeRef = useRef<MemorizationRecitePracticeHandle | null>(null)
  const [recitePhase, setRecitePhase] = useState<RecitePhase>('ready')
  const [reciteFooterUi, setReciteFooterUi] = useState({
    showNextRoundOption: false,
    showFinishOption: false,
    starting: false,
  })

  const onReciteUiStateChange = useCallback(
    (state: {
      showNextRoundOption: boolean
      showFinishOption: boolean
      starting: boolean
    }) => {
      setReciteFooterUi(state)
    },
    []
  )

  const showReciteNextRoundOption =
    practiceMode === 'recite' && recitePhase === 'results' && reciteFooterUi.showNextRoundOption
  const showReciteFinishOption =
    practiceMode === 'recite' && recitePhase === 'results' && reciteFooterUi.showFinishOption
  const reciteStarting = practiceMode === 'recite' && reciteFooterUi.starting

  const onReciteClearHint = useCallback(() => {
    setHintPeekCount(1)
    setHintHeld(false)
  }, [setHintHeld, setHintPeekCount])

  const onReciteAttemptMetrics = useCallback(
    (metrics: ReciteAttemptMetrics) => {
      for (let i = 0; i < metrics.wrong; i++) {
        recordWrongAttempt()
      }
      setCorrectKeystrokesTotal((c) => c + metrics.correct)
      setRoundCompletedWithErrors(metrics.hadErrors)
      setHasTypedInRound(true)
    },
    [recordWrongAttempt, setCorrectKeystrokesTotal, setHasTypedInRound, setRoundCompletedWithErrors]
  )

  const onReciteRepeatRound = useCallback(() => {
    startRoundAndFocusInputRef.current(roundIndex)
    persistPracticeSnapshotRef.current(
      { kind: 'inRound', roundIndex },
      { wrongAttemptsInRound: 0 }
    )
  }, [roundIndex, persistPracticeSnapshotRef, startRoundAndFocusInputRef])

  const onReciteNextRound = useCallback(() => {
    recitePracticeRef.current?.applyAttemptMetrics()
    onRoundCompleteRef.current()
    if (completedRef.current) return
    const nextAllowed = memorizationRoundAdvanceShowsNextRound({
      isFinalRound: roundIndex >= MEMORIZATION_FULL_HIDE_ROUND,
      roundCompletedWithErrors: wrongAttemptsInRoundRef.current > 0,
      strictMode: strictModeRef.current,
      wrongAttemptsInRound: wrongAttemptsInRoundRef.current,
    })
    if (nextAllowed) {
      startRoundAndFocusInputRef.current(roundIndex + 1)
      persistPracticeSnapshotRef.current(
        { kind: 'inRound', roundIndex: roundIndex + 1 },
        { wrongAttemptsInRound: 0 }
      )
    }
  }, [
    completedRef,
    onRoundCompleteRef,
    persistPracticeSnapshotRef,
    roundIndex,
    startRoundAndFocusInputRef,
    strictModeRef,
    wrongAttemptsInRoundRef,
  ])

  const onReciteFinishPractice = useCallback(() => {
    recitePracticeRef.current?.applyAttemptMetrics()
    onRoundCompleteRef.current()
    if (!completedRef.current) {
      finishPracticeSessionRef.current()
    }
  }, [completedRef, finishPracticeSessionRef, onRoundCompleteRef])

  const startReciteRecording = useCallback(async () => {
    await recitePracticeRef.current?.startRecording()
  }, [])

  const stopReciteRecording = useCallback(async () => {
    await recitePracticeRef.current?.stopRecording()
  }, [])

  const resetRecitePhase = useCallback(() => {
    setRecitePhase('ready')
  }, [])

  const cancelRecitePractice = useCallback(() => {
    recitePracticeRef.current?.cancel()
  }, [])

  const prepareReciteClose = useCallback(async () => {
    await recitePracticeRef.current?.prepareClose()
  }, [])

  useEffect(() => {
    if (practiceMode !== 'recite' || !isPracticePhaseInSession(phase)) return
    if (isRoundComplete) {
      recitePracticeRef.current?.resetAttemptState()
    }
  }, [practiceMode, phase, isRoundComplete, roundIndex])

  return {
    recitePracticeRef,
    recitePhase,
    setRecitePhase,
    onReciteUiStateChange,
    showReciteNextRoundOption,
    showReciteFinishOption,
    reciteStarting,
    onReciteClearHint,
    onReciteAttemptMetrics,
    onReciteRepeatRound,
    onReciteNextRound,
    onReciteFinishPractice,
    startReciteRecording,
    stopReciteRecording,
    resetRecitePhase,
    cancelRecitePractice,
    prepareReciteClose,
  }
}

export function useMemorizationPracticeDeferredCallbackRefs() {
  const startRoundAndFocusInputRef = useRef<(round: number) => void>(() => {})
  const persistPracticeSnapshotRef = useRef<
    (
      phasePayload: MemorizationInProgressSavePayload['phase'],
      options?: { wrongAttemptsInRound?: number }
    ) => void
  >(() => {})
  const finishPracticeSessionRef = useRef<() => void>(() => {})
  return { startRoundAndFocusInputRef, persistPracticeSnapshotRef, finishPracticeSessionRef }
}
