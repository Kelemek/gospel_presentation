'use client'

import { startTransition, useCallback, useEffect } from 'react'
import type { MutableRefObject, RefObject } from 'react'
import { flushSync } from 'react-dom'
import type {
  MemorizationInProgressSavePayload,
  MemorizationPracticeMode,
} from '@/lib/verseMemorizationStorage'
import {
  MEMORIZATION_FULL_HIDE_ROUND,
  generateMemorizationSessionSeed,
} from '@/lib/memorizationPracticeUtils'
import {
  isPracticePhaseInSession,
} from '@/lib/memorizationPracticePhase'
import { isRecitePracticeMode, RECITE_VERSE_LIMIT_MESSAGE } from '@/lib/memorizationReciteIntegration'
import { isKeyboardPracticeMode } from '@/lib/memorizationPracticeSessionHelpers'
import type { MemorizationPracticeActionsSlice } from '@/lib/memorizationPracticeSessionContract'
import type { MemorizationPracticePhase } from '@/lib/memorizationPracticePhase'

type UseMemorizationPracticeSessionActionsOptions = {
  onClose: () => void
  onPersistInProgress?: (payload: MemorizationInProgressSavePayload) => void
  onClearInProgress?: () => void
  reciteModeAvailable: boolean
  startRoundChoice: number
  startRound: (round: number) => void
  phase: MemorizationPracticePhase
  isRoundComplete: boolean
  roundIndex: number
  modePickerOpen: boolean
  listenPanelOpen: boolean
  setModePickerOpen: (open: boolean) => void
  setListenPanelOpen: (open: boolean) => void
  setReciteModeBlockedMessage: (msg: string | null) => void
  setPracticeMode: (mode: MemorizationPracticeMode | null) => void
  stopPassageAudio: () => void
  prepareReciteClose: () => Promise<void>
  practiceScrollRef: RefObject<HTMLDivElement | null>
  practiceInputRef: MutableRefObject<HTMLInputElement | null>
  sessionSeedRef: MutableRefObject<string>
  practiceModeRef: MutableRefObject<MemorizationPracticeMode | null>
  wrongAttemptsRef: MutableRefObject<number>
  correctKeystrokesRef: MutableRefObject<number>
  wrongAttemptsInRoundRef: MutableRefObject<number>
  completedRef: MutableRefObject<boolean>
  finishPracticeSession: () => void
  startRoundAndFocusInputRef: MutableRefObject<(round: number) => void>
  persistPracticeSnapshotRef: MutableRefObject<
    (
      phasePayload: MemorizationInProgressSavePayload['phase'],
      options?: { wrongAttemptsInRound?: number }
    ) => void
  >
}

export function useMemorizationPracticeSessionActions({
  onClose,
  onPersistInProgress,
  reciteModeAvailable,
  startRoundChoice,
  startRound,
  phase,
  isRoundComplete,
  roundIndex,
  modePickerOpen,
  listenPanelOpen,
  setModePickerOpen,
  setListenPanelOpen,
  setReciteModeBlockedMessage,
  setPracticeMode,
  stopPassageAudio,
  prepareReciteClose,
  practiceScrollRef,
  practiceInputRef,
  sessionSeedRef,
  practiceModeRef,
  wrongAttemptsRef,
  correctKeystrokesRef,
  wrongAttemptsInRoundRef,
  completedRef,
  finishPracticeSession,
  startRoundAndFocusInputRef,
  persistPracticeSnapshotRef,
}: UseMemorizationPracticeSessionActionsOptions): Pick<
  MemorizationPracticeActionsSlice,
  | 'handleClose'
  | 'finishPracticeSession'
  | 'startRoundAndFocusInput'
  | 'persistPracticeSnapshot'
  | 'onPersistInProgress'
> & {
  beginPracticeWithMode: (mode: MemorizationPracticeMode) => void
} {
  const persistPracticeSnapshot = useCallback(
    (
      phasePayload: MemorizationInProgressSavePayload['phase'],
      options?: { wrongAttemptsInRound?: number }
    ) => {
      if (!onPersistInProgress || !sessionSeedRef.current) return
      const mode = practiceModeRef.current ?? 'type'
      onPersistInProgress({
        sessionSeed: sessionSeedRef.current,
        wrongAttempts: wrongAttemptsRef.current,
        correctKeystrokes: correctKeystrokesRef.current,
        phase: phasePayload,
        practiceMode: mode,
        wrongAttemptsInRound: options?.wrongAttemptsInRound ?? wrongAttemptsInRoundRef.current,
      })
    },
    [
      onPersistInProgress,
      sessionSeedRef,
      practiceModeRef,
      wrongAttemptsRef,
      correctKeystrokesRef,
      wrongAttemptsInRoundRef,
    ]
  )

  const startRoundAndFocusInput = useCallback(
    (r: number) => {
      flushSync(() => {
        startRound(r)
      })
      if (practiceScrollRef.current) {
        practiceScrollRef.current.scrollTop = 0
      }
      if (isKeyboardPracticeMode(practiceModeRef.current)) {
        practiceInputRef.current?.focus({ preventScroll: true })
      }
    },
    [practiceInputRef, practiceModeRef, practiceScrollRef, startRound]
  )

  const handleClose = useCallback(async () => {
    setListenPanelOpen(false)
    stopPassageAudio()
    if (isRecitePracticeMode(practiceModeRef.current)) {
      await prepareReciteClose()
    }
    if (onPersistInProgress && sessionSeedRef.current && isPracticePhaseInSession(phase)) {
      if (isRoundComplete) {
        persistPracticeSnapshot(
          { kind: 'betweenRounds', completedRoundIndex: roundIndex },
          { wrongAttemptsInRound: wrongAttemptsInRoundRef.current }
        )
      } else {
        persistPracticeSnapshot({ kind: 'inRound', roundIndex })
      }
    }
    onClose()
  }, [
    onClose,
    onPersistInProgress,
    phase,
    isRoundComplete,
    roundIndex,
    persistPracticeSnapshot,
    stopPassageAudio,
    setListenPanelOpen,
    wrongAttemptsInRoundRef,
    practiceModeRef,
    prepareReciteClose,
    sessionSeedRef,
  ])

  const beginPracticeWithMode = useCallback(
    (mode: MemorizationPracticeMode) => {
      if (isRecitePracticeMode(mode)) {
        if (!reciteModeAvailable) {
          setReciteModeBlockedMessage(RECITE_VERSE_LIMIT_MESSAGE)
          return
        }
        setReciteModeBlockedMessage(null)
      } else {
        setReciteModeBlockedMessage(null)
      }
      stopPassageAudio()
      setModePickerOpen(false)
      completedRef.current = false
      sessionSeedRef.current = generateMemorizationSessionSeed()
      practiceModeRef.current = mode
      const r = Math.min(
        MEMORIZATION_FULL_HIDE_ROUND,
        Math.max(1, Math.floor(startRoundChoice))
      )
      flushSync(() => {
        setPracticeMode(mode)
        startRound(r)
      })
      if (practiceScrollRef.current) {
        practiceScrollRef.current.scrollTop = 0
      }
      if (isKeyboardPracticeMode(mode)) {
        practiceInputRef.current?.focus({ preventScroll: true })
      }
      onPersistInProgress?.({
        sessionSeed: sessionSeedRef.current,
        wrongAttempts: 0,
        wrongAttemptsInRound: 0,
        correctKeystrokes: 0,
        phase: { kind: 'inRound', roundIndex: r },
        practiceMode: mode,
      })
    },
    [
      onPersistInProgress,
      reciteModeAvailable,
      startRound,
      startRoundChoice,
      stopPassageAudio,
      completedRef,
      sessionSeedRef,
      practiceModeRef,
      practiceScrollRef,
      practiceInputRef,
      setModePickerOpen,
      setReciteModeBlockedMessage,
      setPracticeMode,
    ]
  )

  useEffect(() => {
    startRoundAndFocusInputRef.current = startRoundAndFocusInput
    persistPracticeSnapshotRef.current = persistPracticeSnapshot
  }, [
    startRoundAndFocusInput,
    persistPracticeSnapshot,
    startRoundAndFocusInputRef,
    persistPracticeSnapshotRef,
  ])

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (modePickerOpen) {
        setModePickerOpen(false)
        return
      }
      if (listenPanelOpen) {
        setListenPanelOpen(false)
        return
      }
      void handleClose()
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [handleClose, listenPanelOpen, modePickerOpen, setListenPanelOpen, setModePickerOpen])

  return {
    handleClose,
    finishPracticeSession,
    startRoundAndFocusInput,
    persistPracticeSnapshot,
    onPersistInProgress,
    beginPracticeWithMode,
  }
}

type UseMemorizationPracticeStartOverOptions = {
  verseId: string
  onClearInProgress?: () => void
  stopPassageAudio: () => void
  cancelRecitePractice: () => void
  resetRecitePhase: () => void
  resetIntro: () => void
  setListenPanelOpen: (open: boolean) => void
  sessionSeedRef: MutableRefObject<string>
  completedRef: MutableRefObject<boolean>
  roundAdvanceHandledRef: MutableRefObject<number | null>
  openedLayoutOnceForVerseIdRef: MutableRefObject<string | null>
  lastVerseIdForLayoutRef: MutableRefObject<string>
  resetPracticeUiStateForStartOver: () => void
}

export function useMemorizationPracticeStartOver({
  verseId,
  onClearInProgress,
  stopPassageAudio,
  cancelRecitePractice,
  resetRecitePhase,
  resetIntro,
  setListenPanelOpen,
  sessionSeedRef,
  completedRef,
  roundAdvanceHandledRef,
  openedLayoutOnceForVerseIdRef,
  lastVerseIdForLayoutRef,
  resetPracticeUiStateForStartOver,
}: UseMemorizationPracticeStartOverOptions) {
  return useCallback(() => {
    setListenPanelOpen(false)
    stopPassageAudio()
    cancelRecitePractice()
    onClearInProgress?.()
    sessionSeedRef.current = ''
    completedRef.current = false
    roundAdvanceHandledRef.current = null
    openedLayoutOnceForVerseIdRef.current = null
    lastVerseIdForLayoutRef.current = verseId
    startTransition(() => {
      resetIntro()
      resetPracticeUiStateForStartOver()
      resetRecitePhase()
    })
  }, [
    verseId,
    onClearInProgress,
    stopPassageAudio,
    cancelRecitePractice,
    resetRecitePhase,
    resetIntro,
    setListenPanelOpen,
    sessionSeedRef,
    completedRef,
    roundAdvanceHandledRef,
    openedLayoutOnceForVerseIdRef,
    lastVerseIdForLayoutRef,
    resetPracticeUiStateForStartOver,
  ])
}
