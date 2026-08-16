'use client'

import {
  isPracticePhaseActiveRound,
  isPracticePhaseIntro,
  isPracticePhaseInSession,
  isPracticePhaseRoundComplete,
  practicePhaseRoundIndex,
} from '@/lib/memorizationPracticePhase'
import { useMemorizationPracticePhase } from '@/hooks/useMemorizationPracticePhase'
import { useMemorizationPracticeVerseModel } from '@/hooks/memorizationPractice/useMemorizationPracticeVerseModel'
import { useMemorizationPracticeListenStudy } from '@/hooks/memorizationPractice/useMemorizationPracticeListenStudy'
import { useMemorizationPracticeTypingFlow } from '@/hooks/memorizationPractice/useMemorizationPracticeTypingFlow'
import { useMemorizationPracticeReciteSlice } from '@/hooks/memorizationPractice/useMemorizationPracticeReciteSlice'
import { useMemorizationPracticeRoundRuntime } from '@/hooks/memorizationPractice/useMemorizationPracticeRoundRuntime'
import {
  useMemorizationPracticeSessionActions,
  useMemorizationPracticeStartOver,
} from '@/hooks/memorizationPractice/useMemorizationPracticeSessionActions'
import { useMemorizationPracticeSessionMaintenance } from '@/hooks/memorizationPractice/useMemorizationPracticeSessionMaintenance'
import { useMemorizationPracticeCoreState } from '@/hooks/memorizationPractice/useMemorizationPracticeCoreState'
import { buildMemorizationPracticeSessionState } from '@/lib/buildMemorizationPracticeSessionState'
import { buildMemorizationPracticeTypingBag } from '@/lib/buildMemorizationPracticeTypingBag'
import type { MemorizationPracticeSessionProps } from '@/lib/memorizationPracticeSessionTypes'
import type { MemorizationPracticeSessionState } from '@/lib/memorizationPracticeSessionContract'

export function useMemorizationPracticeRoundFlow({
  verse,
  onClose,
  onComplete,
  onPersistInProgress,
  onClearInProgress,
  onOpenSpurgeonStudy,
  strictMode,
}: MemorizationPracticeSessionProps & { strictMode: boolean }): MemorizationPracticeSessionState {
  const verseModel = useMemorizationPracticeVerseModel(verse)
  const { isBibleBooks, reorderChunks, typableIndices, memorizeAndroidHost, reciteModeAvailable } =
    verseModel

  const {
    phase,
    phaseRef,
    resetIntro,
    startActiveRound,
    completeRound,
    finish: finishPracticePhase,
    hydrateRoundComplete,
    hydrateActiveRound,
  } = useMemorizationPracticePhase()

  const roundIndex = practicePhaseRoundIndex(phase)
  const isRoundComplete = isPracticePhaseRoundComplete(phase)
  const isActiveRound = isPracticePhaseActiveRound(phase)

  const core = useMemorizationPracticeCoreState(verse.id, strictMode)

  const listenStudy = useMemorizationPracticeListenStudy({
    verse,
    isBibleBooks,
    phase,
    isRoundComplete,
    onOpenSpurgeonStudy,
  })
  const { stopPassageAudio, ...listenSlice } = listenStudy

  const typingBag = buildMemorizationPracticeTypingBag({
    verse,
    verseModel,
    phase,
    phaseRef,
    strictMode,
    roundIndex,
    isRoundComplete,
    memorizeAndroidHost,
    core,
  })
  const { typing, keepPracticeInputOnPointerCapture } = useMemorizationPracticeTypingFlow(typingBag)

  const recite = useMemorizationPracticeReciteSlice({
    practiceMode: core.practiceMode,
    phase,
    isRoundComplete,
    roundIndex,
    recordWrongAttempt: core.recordWrongAttempt,
    setCorrectKeystrokesTotal: core.setCorrectKeystrokesTotal,
    setRoundCompletedWithErrors: core.setRoundCompletedWithErrors,
    setHasTypedInRound: core.setHasTypedInRound,
    setHintPeekCount: core.setHintPeekCount,
    setHintHeld: core.setHintHeld,
    startRoundAndFocusInputRef: core.startRoundAndFocusInputRef,
    persistPracticeSnapshotRef: core.persistPracticeSnapshotRef,
    onRoundCompleteRef: core.onRoundCompleteRef,
    finishPracticeSessionRef: core.finishPracticeSessionRef,
    completedRef: core.completedRef,
    wrongAttemptsInRoundRef: core.wrongAttemptsInRoundRef,
    strictModeRef: core.strictModeRef,
  })

  const roundRuntime = useMemorizationPracticeRoundRuntime({
    verseId: verse.id,
    reorderChunks,
    typableIndices,
    memorizeAndroidHost,
    phase,
    phaseRef,
    practiceMode: core.practiceMode,
    practiceModeRef: core.practiceModeRef,
    strictMode,
    strictModeRef: core.strictModeRef,
    roundIndex,
    isRoundComplete,
    isActiveRound,
    wrongAttemptsInRound: core.wrongAttemptsInRound,
    wrongAttemptsInRoundRef: core.wrongAttemptsInRoundRef,
    hiddenIndices: core.hiddenIndices,
    revealed: core.revealed,
    reorderSlotChunkIds: core.reorderSlotChunkIds,
    roundAdvanceHandledRef: core.roundAdvanceHandledRef,
    sessionSeedRef: core.sessionSeedRef,
    completedRef: core.completedRef,
    androidScrollClampUntilRef: core.androidScrollClampUntilRef,
    recitePracticeRef: recite.recitePracticeRef,
    hasOnPersistInProgress: !!onPersistInProgress,
    persistPracticeSnapshotRef: core.persistPracticeSnapshotRef,
    finishPracticeSessionRef: core.finishPracticeSessionRef,
    onRoundCompleteRef: core.onRoundCompleteRef,
    startActiveRound,
    completeRound,
    finishPracticePhase,
    onComplete,
    wrongAttemptsRef: core.wrongAttemptsRef,
    correctKeystrokesRef: core.correctKeystrokesRef,
    resetRoundUiState: core.resetRoundUiState,
    setHiddenIndices: core.setHiddenIndices,
    setReorderSlotChunkIds: core.setReorderSlotChunkIds,
    setReorderRoundMovableIndices: core.setReorderRoundMovableIndices,
    setRoundAffirmation: core.setRoundAffirmation,
    stopPassageAudio,
  })

  const {
    startRound,
    finishPracticeSession,
    isFinalRound,
    showNextRoundOption,
    showFinishPracticeOption,
    showStrictErrorsBadge,
    roundCompleteInstruction,
    reciteRoundAdvanceHeaderCopy,
  } = roundRuntime

  const sessionActions = useMemorizationPracticeSessionActions({
    onClose,
    onPersistInProgress,
    reciteModeAvailable,
    startRoundChoice: core.startRoundChoice,
    startRound,
    phase,
    isRoundComplete,
    roundIndex,
    modePickerOpen: core.modePickerOpen,
    listenPanelOpen: listenSlice.listenPanelOpen,
    setModePickerOpen: core.setModePickerOpen,
    setListenPanelOpen: listenSlice.setListenPanelOpen,
    setReciteModeBlockedMessage: core.setReciteModeBlockedMessage,
    setPracticeMode: core.setPracticeMode,
    stopPassageAudio,
    prepareReciteClose: recite.prepareReciteClose,
    practiceScrollRef: core.practiceScrollRef,
    practiceInputRef: core.practiceInputRef,
    sessionSeedRef: core.sessionSeedRef,
    practiceModeRef: core.practiceModeRef,
    wrongAttemptsRef: core.wrongAttemptsRef,
    correctKeystrokesRef: core.correctKeystrokesRef,
    wrongAttemptsInRoundRef: core.wrongAttemptsInRoundRef,
    completedRef: core.completedRef,
    finishPracticeSession,
    startRoundAndFocusInputRef: core.startRoundAndFocusInputRef,
    persistPracticeSnapshotRef: core.persistPracticeSnapshotRef,
  })

  const handleStartOver = useMemorizationPracticeStartOver({
    verseId: verse.id,
    onClearInProgress,
    stopPassageAudio,
    cancelRecitePractice: recite.cancelRecitePractice,
    resetRecitePhase: recite.resetRecitePhase,
    resetIntro,
    setListenPanelOpen: listenSlice.setListenPanelOpen,
    sessionSeedRef: core.sessionSeedRef,
    completedRef: core.completedRef,
    roundAdvanceHandledRef: core.roundAdvanceHandledRef,
    openedLayoutOnceForVerseIdRef: core.openedLayoutOnceForVerseIdRef,
    lastVerseIdForLayoutRef: core.lastVerseIdForLayoutRef,
    resetPracticeUiStateForStartOver: core.resetPracticeUiStateForStartOver,
  })

  useMemorizationPracticeSessionMaintenance({
    verse,
    phase,
    reorderChunks,
    typableIndices,
    memorizeAndroidHost,
    core,
    resetIntro,
    hydrateRoundComplete,
    hydrateActiveRound,
    keepPracticeInputOnPointerCapture,
    stopPassageAudio,
  })

  const showStartOver =
    typeof onClearInProgress === 'function' &&
    (isPracticePhaseInSession(phase) || (isPracticePhaseIntro(phase) && !!verse.inProgressPractice))

  return buildMemorizationPracticeSessionState({
    props: { verse, onClose, onOpenSpurgeonStudy, onPersistInProgress, onClearInProgress },
    strictMode,
    verseModel,
    round: {
      phase,
      roundIndex,
      isRoundComplete,
      isActiveRound,
      startRoundChoice: core.startRoundChoice,
      setStartRoundChoice: core.setStartRoundChoice,
      hiddenIndices: core.hiddenIndices,
      revealed: core.revealed,
      firstLetterCueRevealedSlots: core.firstLetterCueRevealedSlots,
      reorderSlotChunkIds: core.reorderSlotChunkIds,
      setReorderSlotChunkIds: core.setReorderSlotChunkIds,
      reorderRoundMovableIndices: core.reorderRoundMovableIndices,
      wrongAttemptsInRound: core.wrongAttemptsInRound,
      flashError: core.flashError,
      roundAffirmation: core.roundAffirmation,
      roundCompletedWithErrors: core.roundCompletedWithErrors,
      showStartOver,
      isFinalRound,
      showNextRoundOption,
      showFinishPracticeOption,
      showStrictErrorsBadge,
      roundCompleteInstruction,
      reciteRoundAdvanceHeaderCopy,
    },
    mode: {
      practiceMode: core.practiceMode,
      setPracticeMode: core.setPracticeMode,
      modePickerOpen: core.modePickerOpen,
      setModePickerOpen: core.setModePickerOpen,
      reciteModeBlockedMessage: core.reciteModeBlockedMessage,
      setReciteModeBlockedMessage: core.setReciteModeBlockedMessage,
      modePickerTitleId: core.modePickerTitleId,
      beginPracticeWithMode: sessionActions.beginPracticeWithMode,
    },
    recite: {
      recitePracticeRef: recite.recitePracticeRef,
      recitePhase: recite.recitePhase,
      setRecitePhase: recite.setRecitePhase,
      onReciteUiStateChange: recite.onReciteUiStateChange,
      showReciteNextRoundOption: recite.showReciteNextRoundOption,
      showReciteFinishOption: recite.showReciteFinishOption,
      reciteStarting: recite.reciteStarting,
      onReciteClearHint: recite.onReciteClearHint,
      onReciteAttemptMetrics: recite.onReciteAttemptMetrics,
      onReciteRepeatRound: recite.onReciteRepeatRound,
      onReciteNextRound: recite.onReciteNextRound,
      onReciteFinishPractice: recite.onReciteFinishPractice,
      startReciteRecording: recite.startReciteRecording,
      stopReciteRecording: recite.stopReciteRecording,
    },
    typing,
    listen: listenSlice,
    actions: {
      handleClose: sessionActions.handleClose,
      handleStartOver,
      finishPracticeSession,
      startRoundAndFocusInput: sessionActions.startRoundAndFocusInput,
      persistPracticeSnapshot: sessionActions.persistPracticeSnapshot,
    },
  })
}
