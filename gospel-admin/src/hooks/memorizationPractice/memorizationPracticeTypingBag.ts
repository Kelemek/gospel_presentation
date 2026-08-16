import type { MutableRefObject, RefObject } from 'react'
import type { MemorizationPracticeMode } from '@/lib/verseMemorizationStorage'
import type { MemorizationPracticePhase } from '@/lib/memorizationPracticePhase'
import type { MemorizationPracticeVerseModel } from '@/lib/memorizationPracticeSessionTypes'

export type MemorizationPracticeTypingBag = {
  verse: { id: string }
  verseModel: MemorizationPracticeVerseModel
  phase: MemorizationPracticePhase
  phaseRef: MutableRefObject<MemorizationPracticePhase>
  practiceMode: MemorizationPracticeMode | null
  practiceModeRef: MutableRefObject<MemorizationPracticeMode | null>
  strictMode: boolean
  strictModeRef: MutableRefObject<boolean>
  roundIndex: number
  isRoundComplete: boolean
  hasTypedInRound: boolean
  setHasTypedInRound: (v: boolean | ((p: boolean) => boolean)) => void
  hiddenIndices: Set<number>
  revealed: Set<number>
  setRevealed: (v: Set<number> | ((p: Set<number>) => Set<number>)) => void
  firstLetterCueRevealedSlots: Set<number>
  setFirstLetterCueRevealedSlots: (
    v: Set<number> | ((p: Set<number>) => Set<number>)
  ) => void
  setConsecutiveWrong: (v: number | ((p: number) => number)) => void
  setCorrectKeystrokesTotal: (v: number | ((p: number) => number)) => void
  recordWrongAttempt: () => void
  hintHeld: boolean
  setHintHeld: (v: boolean) => void
  hintPeekCount: number
  setHintPeekCount: (v: number | ((p: number) => number)) => void
  flashErrorBriefly: () => void
  sessionSeedRef: MutableRefObject<string>
  practiceInputRef: MutableRefObject<HTMLInputElement | null>
  practiceScrollRef: RefObject<HTMLDivElement | null>
  practiceWordsWordRef: RefObject<HTMLDivElement | null>
  practiceWordsTypeRef: RefObject<HTMLLabelElement | null>
  firstLetterCuesViewportRef: RefObject<HTMLDivElement | null>
  androidScrollClampUntilRef: MutableRefObject<number>
  suppressInputFromKeydownRef: MutableRefObject<boolean>
  memorizeAndroidHost: boolean
  assignPracticeInputRef: (node: HTMLInputElement | null) => void
  hintButtonRef: RefObject<HTMLButtonElement | null>
}
