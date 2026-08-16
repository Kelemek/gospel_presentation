import { buildMemorizationPracticeSessionState } from '@/lib/buildMemorizationPracticeSessionState'
import { MEMORIZATION_PRACTICE_PHASE_INTRO } from '@/lib/memorizationPracticePhase'
import type { MemorizedVerse } from '@/lib/verseMemorizationStorage'

const verse: MemorizedVerse = {
  id: 'v1',
  reference: 'John 3:16',
  text: 'For God so loved the world',
  translation: 'esv',
  dateAdded: 1,
  lastPracticedAt: null,
  practiceSessions: [],
}

describe('buildMemorizationPracticeSessionState', () => {
  it('groups slices into the session contract and wires persist callbacks from props', () => {
    const onPersistInProgress = jest.fn()
    const onClearInProgress = jest.fn()
    const beginPracticeWithMode = jest.fn()

    const session = buildMemorizationPracticeSessionState({
      props: {
        verse,
        onClose: jest.fn(),
        onPersistInProgress,
        onClearInProgress,
      },
      strictMode: false,
      verseModel: {
        isBibleBooks: false,
        tokens: [],
        typableIndices: [0],
        reorderChunks: [],
        reorderColonAfterSlotIndex: null,
        memorizeAndroidHost: false,
        reciteModeVisible: true,
        reciteModeAvailable: true,
      },
      round: {
        phase: MEMORIZATION_PRACTICE_PHASE_INTRO,
        roundIndex: 0,
        isRoundComplete: false,
        isFinalRound: false,
        isActiveRound: false,
        startRoundChoice: 1,
        setStartRoundChoice: jest.fn(),
        hiddenIndices: new Set(),
        revealed: new Set(),
        firstLetterCueRevealedSlots: new Set(),
        reorderSlotChunkIds: [],
        setReorderSlotChunkIds: jest.fn(),
        reorderRoundMovableIndices: new Set(),
        wrongAttemptsInRound: 0,
        flashError: false,
        roundAffirmation: '',
        roundCompletedWithErrors: false,
        showNextRoundOption: false,
        showFinishPracticeOption: false,
        showStrictErrorsBadge: false,
        roundCompleteInstruction: null,
        reciteRoundAdvanceHeaderCopy: '',
        showStartOver: false,
      },
      mode: {
        practiceMode: null,
        setPracticeMode: jest.fn(),
        modePickerOpen: false,
        setModePickerOpen: jest.fn(),
        reciteModeBlockedMessage: null,
        setReciteModeBlockedMessage: jest.fn(),
        modePickerTitleId: 'mode-title',
        beginPracticeWithMode,
      },
      recite: {
        recitePracticeRef: { current: null },
        recitePhase: 'ready',
        setRecitePhase: jest.fn(),
        onReciteUiStateChange: jest.fn(),
        showReciteNextRoundOption: false,
        showReciteFinishOption: false,
        reciteStarting: false,
        onReciteClearHint: jest.fn(),
        onReciteAttemptMetrics: jest.fn(),
        onReciteRepeatRound: jest.fn(),
        onReciteNextRound: jest.fn(),
        onReciteFinishPractice: jest.fn(),
        startReciteRecording: jest.fn(),
        stopReciteRecording: jest.fn(),
      },
      typing: {
        hintActive: false,
        hintPeekIndices: new Set(),
        currentTargetIndex: null,
        currentTargetToken: null,
        firstLetterCueHiddenSlots: new Set(),
        practiceInputDomId: 'mem-input',
        verseTouchMovedRef: { current: false },
        verseTouchStartRef: { current: { x: 0, y: 0 } },
        restorePracticeInputFocusAfterHint: jest.fn(),
        processWordGuess: jest.fn(),
        handleReorderInvalidDrop: jest.fn(),
        handleReorderWrongSwap: jest.fn(),
        handleReorderSlotsBecameCorrect: jest.fn(),
        wordChoiceLabels: [],
        handlePracticeInputKeyDown: jest.fn(),
        handlePracticeInput: jest.fn(),
        keyboardInsetPx: 0,
        assignPracticeInputRef: jest.fn(),
        practiceInputRef: { current: null },
        hintButtonRef: { current: null },
        practiceScrollRef: { current: null },
        firstLetterCuesViewportRef: { current: null },
        practiceWordsWordRef: { current: null },
        practiceWordsTypeRef: { current: null },
        setHintHeld: jest.fn(),
        setHintPeekCount: jest.fn(),
      },
      listen: {
        listenViaEsvPassageUrl: true,
        listenInteractionAllowed: true,
        spurgeonStudyMatch: 'unset',
        passageAudioRef: { current: null },
        handlePassageAudioPlay: jest.fn(),
        handlePassageAudioPause: jest.fn(),
        handlePassageAudioEnded: jest.fn(),
        handlePassageAudioError: jest.fn(),
        listenPanelOpen: false,
        setListenPanelOpen: jest.fn(),
        listenPanelVisible: false,
        listenPlaybackRate: 1,
        onSelectSpeed: jest.fn(),
        repeatListenOn: false,
        handleRepeatListenToggle: jest.fn(),
        handleListenPassageClick: jest.fn(),
        readAloudDialogPrimaryLabel: 'Listen',
        readAloudDialogPrimaryAriaLabel: 'Listen',
        listenAriaPressed: false,
      },
      actions: {
        handleClose: jest.fn(),
        handleStartOver: jest.fn(),
        finishPracticeSession: jest.fn(),
        startRoundAndFocusInput: jest.fn(),
        persistPracticeSnapshot: jest.fn(),
      },
    })

    expect(session.verse.id).toBe('v1')
    expect(session.mode.beginPracticeWithMode).toBe(beginPracticeWithMode)
    expect(session.actions.onPersistInProgress).toBe(onPersistInProgress)
    expect(session.actions.onClearInProgress).toBe(onClearInProgress)
    expect(session.recite.recitePracticeRef).toEqual({ current: null })
    expect(session.typing.practiceInputDomId).toBe('mem-input')
  })
})
