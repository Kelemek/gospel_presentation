import type { FormEvent, KeyboardEvent, MutableRefObject, RefObject } from 'react'
import type {
  MemorizationInProgressSavePayload,
  MemorizedVerse,
} from '@/lib/verseMemorizationStorage'
import type { MemorizationPracticePhase } from '@/lib/memorizationPracticePhase'
import type {
  MemorizationRecitePracticeHandle,
  ReciteAttemptMetrics,
  RecitePhase,
} from '@/lib/memorizationRecitePracticeTypes'
import type { MemorizationToken } from '@/lib/memorizationPracticeUtils'
import type { MemorizeListenSpeed } from '@/lib/memorizeListenSpeedStorage'
import type {
  MemorizationPracticeModeSlice,
  MemorizationPracticeVerseModel,
  SpurgeonStudyMatch,
} from '@/lib/memorizationPracticeSessionTypes'

export type {
  MemorizationPracticeModeSlice,
  MemorizationPracticeVerseModel,
  SpurgeonStudyMatch,
} from '@/lib/memorizationPracticeSessionTypes'

export type MemorizationPracticeTypingSlice = {
  hintActive: boolean
  hintPeekIndices: Set<number>
  currentTargetIndex: number | null
  currentTargetToken: MemorizationToken | null
  firstLetterCueHiddenSlots: Set<number>
  practiceInputDomId: string
  verseTouchMovedRef: MutableRefObject<boolean>
  verseTouchStartRef: MutableRefObject<{ x: number; y: number }>
  restorePracticeInputFocusAfterHint: () => void
  processWordGuess: (label: string) => void
  handleReorderInvalidDrop: () => void
  handleReorderWrongSwap: () => void
  handleReorderSlotsBecameCorrect: (slots: number[]) => void
  wordChoiceLabels: string[]
  handlePracticeInputKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void
  handlePracticeInput: (e: FormEvent<HTMLInputElement>) => void
  keyboardInsetPx: number
  assignPracticeInputRef: (node: HTMLInputElement | null) => void
  practiceInputRef: MutableRefObject<HTMLInputElement | null>
  hintButtonRef: RefObject<HTMLButtonElement | null>
  practiceScrollRef: RefObject<HTMLDivElement | null>
  firstLetterCuesViewportRef: RefObject<HTMLDivElement | null>
  practiceWordsWordRef: RefObject<HTMLDivElement | null>
  practiceWordsTypeRef: RefObject<HTMLLabelElement | null>
  setHintHeld: (held: boolean) => void
  setHintPeekCount: (count: number | ((prev: number) => number)) => void
}

export type MemorizationPracticeRoundSlice = {
  phase: MemorizationPracticePhase
  roundIndex: number
  isRoundComplete: boolean
  isFinalRound: boolean
  isActiveRound: boolean
  startRoundChoice: number
  setStartRoundChoice: (choice: number) => void
  hiddenIndices: Set<number>
  revealed: Set<number>
  firstLetterCueRevealedSlots: Set<number>
  reorderSlotChunkIds: number[]
  setReorderSlotChunkIds: (ids: number[] | ((prev: number[]) => number[])) => void
  reorderRoundMovableIndices: Set<number>
  wrongAttemptsInRound: number
  flashError: boolean
  roundAffirmation: string
  roundCompletedWithErrors: boolean
  showNextRoundOption: boolean
  showFinishPracticeOption: boolean
  showStrictErrorsBadge: boolean
  roundCompleteInstruction: string | null
  reciteRoundAdvanceHeaderCopy: string
  showStartOver: boolean
}

export type MemorizationPracticeReciteSlice = {
  recitePracticeRef: MutableRefObject<MemorizationRecitePracticeHandle | null>
  recitePhase: RecitePhase
  setRecitePhase: (phase: RecitePhase) => void
  onReciteUiStateChange: (state: {
    showNextRoundOption: boolean
    showFinishOption: boolean
    starting: boolean
  }) => void
  showReciteNextRoundOption: boolean
  showReciteFinishOption: boolean
  reciteStarting: boolean
  onReciteClearHint: () => void
  onReciteAttemptMetrics: (metrics: ReciteAttemptMetrics) => void
  onReciteRepeatRound: () => void
  onReciteNextRound: () => void
  onReciteFinishPractice: () => void
  startReciteRecording: () => void | Promise<void>
  stopReciteRecording: () => void | Promise<void>
}

export type MemorizationPracticeListenSlice = {
  listenViaEsvPassageUrl: boolean
  listenInteractionAllowed: boolean
  spurgeonStudyMatch: SpurgeonStudyMatch
  passageAudioRef: RefObject<HTMLAudioElement | null>
  handlePassageAudioPlay: () => void
  handlePassageAudioPause: () => void
  handlePassageAudioEnded: () => void
  handlePassageAudioError: () => void
  listenPanelOpen: boolean
  setListenPanelOpen: (open: boolean) => void
  listenPanelVisible: boolean
  listenPlaybackRate: MemorizeListenSpeed
  onSelectSpeed: (rate: MemorizeListenSpeed) => void
  repeatListenOn: boolean
  handleRepeatListenToggle: () => void
  handleListenPassageClick: () => void
  readAloudDialogPrimaryLabel: string
  readAloudDialogPrimaryAriaLabel: string
  listenAriaPressed: boolean
}

export type MemorizationPracticeActionsSlice = {
  handleClose: () => void | Promise<void>
  handleStartOver: () => void
  finishPracticeSession: () => void
  startRoundAndFocusInput: (round: number) => void
  persistPracticeSnapshot: (
    phasePayload: MemorizationInProgressSavePayload['phase'],
    options?: { wrongAttemptsInRound?: number }
  ) => void
  onPersistInProgress?: (payload: MemorizationInProgressSavePayload) => void
  onClearInProgress?: () => void
}

/** Grouped session contract returned by memorize practice hooks. */
export type MemorizationPracticeSessionState = {
  verse: MemorizedVerse
  strictMode: boolean
  onClose: () => void
  onOpenSpurgeonStudy?: (reference: string) => void
  verseModel: MemorizationPracticeVerseModel
  round: MemorizationPracticeRoundSlice
  mode: MemorizationPracticeModeSlice
  recite: MemorizationPracticeReciteSlice
  typing: MemorizationPracticeTypingSlice
  listen: MemorizationPracticeListenSlice
  actions: MemorizationPracticeActionsSlice
}
