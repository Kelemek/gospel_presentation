import type { MutableRefObject } from 'react'
import type { MemorizationPracticePhase } from '@/lib/memorizationPracticePhase'
import type { MemorizationPracticeVerseModel } from '@/lib/memorizationPracticeSessionTypes'
import type { MemorizedVerse } from '@/lib/verseMemorizationStorage'
import type { MemorizationPracticeCoreState } from '@/hooks/memorizationPractice/useMemorizationPracticeCoreState'
import type { MemorizationPracticeTypingBag } from '@/hooks/memorizationPractice/memorizationPracticeTypingBag'

export function buildMemorizationPracticeTypingBag({
  verse,
  verseModel,
  phase,
  phaseRef,
  strictMode,
  roundIndex,
  isRoundComplete,
  memorizeAndroidHost,
  core,
}: {
  verse: MemorizedVerse
  verseModel: MemorizationPracticeVerseModel
  phase: MemorizationPracticePhase
  phaseRef: MutableRefObject<MemorizationPracticePhase>
  strictMode: boolean
  roundIndex: number
  isRoundComplete: boolean
  memorizeAndroidHost: boolean
  core: MemorizationPracticeCoreState
}): MemorizationPracticeTypingBag {
  return {
    verse,
    verseModel,
    phase,
    phaseRef,
    practiceMode: core.practiceMode,
    practiceModeRef: core.practiceModeRef,
    strictMode,
    strictModeRef: core.strictModeRef,
    roundIndex,
    isRoundComplete,
    hasTypedInRound: core.hasTypedInRound,
    setHasTypedInRound: core.setHasTypedInRound,
    hiddenIndices: core.hiddenIndices,
    revealed: core.revealed,
    setRevealed: core.setRevealed,
    firstLetterCueRevealedSlots: core.firstLetterCueRevealedSlots,
    setFirstLetterCueRevealedSlots: core.setFirstLetterCueRevealedSlots,
    setConsecutiveWrong: core.setConsecutiveWrong,
    setCorrectKeystrokesTotal: core.setCorrectKeystrokesTotal,
    recordWrongAttempt: core.recordWrongAttempt,
    hintHeld: core.hintHeld,
    setHintHeld: core.setHintHeld,
    hintPeekCount: core.hintPeekCount,
    setHintPeekCount: core.setHintPeekCount,
    flashErrorBriefly: core.flashErrorBriefly,
    sessionSeedRef: core.sessionSeedRef,
    practiceInputRef: core.practiceInputRef,
    practiceScrollRef: core.practiceScrollRef,
    practiceWordsWordRef: core.practiceWordsWordRef,
    practiceWordsTypeRef: core.practiceWordsTypeRef,
    firstLetterCuesViewportRef: core.firstLetterCuesViewportRef,
    androidScrollClampUntilRef: core.androidScrollClampUntilRef,
    suppressInputFromKeydownRef: core.suppressInputFromKeydownRef,
    memorizeAndroidHost,
    assignPracticeInputRef: core.assignPracticeInputRef,
    hintButtonRef: core.hintButtonRef,
  }
}
