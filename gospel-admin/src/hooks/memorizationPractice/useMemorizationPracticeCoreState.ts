'use client'

import { useCallback, useId, useLayoutEffect, useRef, useState } from 'react'
import type { MutableRefObject, RefObject } from 'react'
import type { MemorizationInProgressSavePayload, MemorizationPracticeMode } from '@/lib/verseMemorizationStorage'
import { useMemorizationRoundErrors } from '@/hooks/useMemorizationRoundErrors'
import {
  useMemorizationPracticeDeferredCallbackRefs,
} from '@/hooks/memorizationPractice/useMemorizationPracticeReciteSlice'
import {
  useMemorizationPracticeHydrationRefs,
} from '@/hooks/memorizationPractice/useMemorizationPracticeInProgressHydration'

/** Round UI state, persistence refs, and error counters for memorize practice. */
export function useMemorizationPracticeCoreState(verseId: string, strictMode: boolean) {
  const [practiceMode, setPracticeMode] = useState<MemorizationPracticeMode | null>(null)
  const [modePickerOpen, setModePickerOpen] = useState(false)
  const [reciteModeBlockedMessage, setReciteModeBlockedMessage] = useState<string | null>(null)
  const [roundCompletedWithErrors, setRoundCompletedWithErrors] = useState(false)
  const [startRoundChoice, setStartRoundChoice] = useState(1)
  const [hasTypedInRound, setHasTypedInRound] = useState(false)
  const [hiddenIndices, setHiddenIndices] = useState<Set<number>>(new Set())
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [firstLetterCueRevealedSlots, setFirstLetterCueRevealedSlots] = useState(
    () => new Set<number>()
  )
  const [reorderSlotChunkIds, setReorderSlotChunkIds] = useState<number[]>([])
  const [reorderRoundMovableIndices, setReorderRoundMovableIndices] = useState<Set<number>>(
    () => new Set()
  )
  const [, setConsecutiveWrong] = useState(0)
  const [wrongAttemptsTotal, setWrongAttemptsTotal] = useState(0)
  const {
    wrongAttemptsInRound,
    wrongAttemptsInRoundRef,
    recordWrongAttempt,
    resetRoundErrors,
    hydrateRoundErrors,
  } = useMemorizationRoundErrors(useCallback(() => {
    setWrongAttemptsTotal((w) => w + 1)
  }, []))
  const [correctKeystrokesTotal, setCorrectKeystrokesTotal] = useState(0)
  const [flashError, setFlashError] = useState(false)
  const [hintHeld, setHintHeld] = useState(false)
  const [hintPeekCount, setHintPeekCount] = useState(1)
  const [roundAffirmation, setRoundAffirmation] = useState('')

  const wrongAttemptsRef = useRef(0)
  const strictModeRef = useRef(false)
  const correctKeystrokesRef = useRef(0)
  const practiceModeRef = useRef<MemorizationPracticeMode | null>(null)
  const completedRef = useRef(false)
  const roundAdvanceHandledRef = useRef<number | null>(null)
  const sessionSeedRef = useRef<string>('')
  const practiceInputRef = useRef<HTMLInputElement>(null)
  const assignPracticeInputRef = useCallback((node: HTMLInputElement | null) => {
    practiceInputRef.current = node
  }, [])
  const androidScrollClampUntilRef = useRef(0)
  const suppressInputFromKeydownRef = useRef(false)
  const practiceScrollRef = useRef<HTMLDivElement>(null)
  const firstLetterCuesViewportRef = useRef<HTMLDivElement>(null)
  const modePickerTitleId = useId()
  const practiceWordsWordRef = useRef<HTMLDivElement | null>(null)
  const practiceWordsTypeRef = useRef<HTMLLabelElement | null>(null)
  const hintButtonRef = useRef<HTMLButtonElement>(null)
  const onRoundCompleteRef = useRef<() => void>(() => {})

  const { startRoundAndFocusInputRef, persistPracticeSnapshotRef, finishPracticeSessionRef } =
    useMemorizationPracticeDeferredCallbackRefs()
  const { openedLayoutOnceForVerseIdRef, lastVerseIdForLayoutRef } =
    useMemorizationPracticeHydrationRefs(verseId)

  const flashErrorBriefly = useCallback(() => {
    setFlashError(true)
    window.setTimeout(() => setFlashError(false), 120)
  }, [])

  const resetRoundUiState = useCallback(
    (options?: { clearCompletedWithErrors?: boolean }) => {
      setHasTypedInRound(false)
      setRevealed(new Set())
      setFirstLetterCueRevealedSlots(new Set())
      setConsecutiveWrong(0)
      resetRoundErrors()
      setRoundAffirmation('')
      if (options?.clearCompletedWithErrors) {
        setRoundCompletedWithErrors(false)
      }
    },
    [
      resetRoundErrors,
      setHasTypedInRound,
      setRevealed,
      setFirstLetterCueRevealedSlots,
      setConsecutiveWrong,
      setRoundAffirmation,
      setRoundCompletedWithErrors,
    ]
  )

  const resetPracticeUiStateForStartOver = useCallback(() => {
    resetRoundUiState({ clearCompletedWithErrors: true })
    setStartRoundChoice(1)
    setHiddenIndices(new Set())
    setReorderSlotChunkIds([])
    setReorderRoundMovableIndices(new Set())
    setWrongAttemptsTotal(0)
    setCorrectKeystrokesTotal(0)
    setPracticeMode(null)
    setModePickerOpen(false)
    setReciteModeBlockedMessage(null)
  }, [
    resetRoundUiState,
    setStartRoundChoice,
    setHiddenIndices,
    setReorderSlotChunkIds,
    setReorderRoundMovableIndices,
    setWrongAttemptsTotal,
    setCorrectKeystrokesTotal,
    setPracticeMode,
    setModePickerOpen,
    setReciteModeBlockedMessage,
  ])

  useLayoutEffect(() => {
    wrongAttemptsRef.current = wrongAttemptsTotal
    correctKeystrokesRef.current = correctKeystrokesTotal
    practiceModeRef.current = practiceMode
    strictModeRef.current = strictMode
  }, [wrongAttemptsTotal, correctKeystrokesTotal, practiceMode, strictMode])

  return {
    practiceMode,
    setPracticeMode,
    modePickerOpen,
    setModePickerOpen,
    reciteModeBlockedMessage,
    setReciteModeBlockedMessage,
    roundCompletedWithErrors,
    setRoundCompletedWithErrors,
    startRoundChoice,
    setStartRoundChoice,
    hasTypedInRound,
    setHasTypedInRound,
    hiddenIndices,
    setHiddenIndices,
    revealed,
    setRevealed,
    firstLetterCueRevealedSlots,
    setFirstLetterCueRevealedSlots,
    reorderSlotChunkIds,
    setReorderSlotChunkIds,
    reorderRoundMovableIndices,
    setReorderRoundMovableIndices,
    setConsecutiveWrong,
    wrongAttemptsTotal,
    setWrongAttemptsTotal,
    wrongAttemptsInRound,
    wrongAttemptsInRoundRef,
    recordWrongAttempt,
    resetRoundErrors,
    hydrateRoundErrors,
    correctKeystrokesTotal,
    setCorrectKeystrokesTotal,
    flashError,
    hintHeld,
    setHintHeld,
    hintPeekCount,
    setHintPeekCount,
    roundAffirmation,
    setRoundAffirmation,
    wrongAttemptsRef,
    strictModeRef,
    correctKeystrokesRef,
    practiceModeRef,
    completedRef,
    roundAdvanceHandledRef,
    sessionSeedRef,
    practiceInputRef,
    assignPracticeInputRef,
    androidScrollClampUntilRef,
    suppressInputFromKeydownRef,
    practiceScrollRef,
    firstLetterCuesViewportRef,
    modePickerTitleId,
    practiceWordsWordRef,
    practiceWordsTypeRef,
    hintButtonRef,
    onRoundCompleteRef,
    startRoundAndFocusInputRef,
    persistPracticeSnapshotRef,
    finishPracticeSessionRef,
    openedLayoutOnceForVerseIdRef,
    lastVerseIdForLayoutRef,
    flashErrorBriefly,
    resetRoundUiState,
    resetPracticeUiStateForStartOver,
  }
}

export type MemorizationPracticeCoreState = ReturnType<typeof useMemorizationPracticeCoreState>

export type MemorizationPracticeDeferredSnapshotRef = MutableRefObject<
  (
    phasePayload: MemorizationInProgressSavePayload['phase'],
    options?: { wrongAttemptsInRound?: number }
  ) => void
>

export type MemorizationPracticeSessionRefs = {
  wrongAttemptsRef: MutableRefObject<number>
  strictModeRef: MutableRefObject<boolean>
  correctKeystrokesRef: MutableRefObject<number>
  practiceModeRef: MutableRefObject<MemorizationPracticeMode | null>
  completedRef: MutableRefObject<boolean>
  roundAdvanceHandledRef: MutableRefObject<number | null>
  sessionSeedRef: MutableRefObject<string>
  practiceInputRef: MutableRefObject<HTMLInputElement | null>
  androidScrollClampUntilRef: MutableRefObject<number>
  suppressInputFromKeydownRef: MutableRefObject<boolean>
  practiceScrollRef: RefObject<HTMLDivElement | null>
  firstLetterCuesViewportRef: RefObject<HTMLDivElement | null>
  practiceWordsWordRef: RefObject<HTMLDivElement | null>
  practiceWordsTypeRef: RefObject<HTMLLabelElement | null>
  hintButtonRef: RefObject<HTMLButtonElement | null>
  onRoundCompleteRef: MutableRefObject<() => void>
  startRoundAndFocusInputRef: MutableRefObject<(round: number) => void>
  persistPracticeSnapshotRef: MemorizationPracticeDeferredSnapshotRef
  finishPracticeSessionRef: MutableRefObject<() => void>
  openedLayoutOnceForVerseIdRef: MutableRefObject<string | null>
  lastVerseIdForLayoutRef: MutableRefObject<string>
}
