import { MEMORIZATION_PRACTICE_PHASE_INTRO } from '@/lib/memorizationPracticePhase'
import {
  memorizationPracticeKeyboardInsetScrollDelayMs,
  shouldBlurMemorizationPracticeInput,
  shouldFocusMemorizationPracticeInput,
  shouldScrollBlankAfterInputFocus,
  shouldScrollBlankForActiveTarget,
} from '@/lib/memorizationPracticeTypingScrollPolicy'

const activeRound = { kind: 'activeRound', roundIndex: 2 } as const

describe('memorizationPracticeTypingScrollPolicy', () => {
  it('focuses keyboard input during an active type round', () => {
    const input = {
      phase: activeRound,
      practiceMode: 'type' as const,
      isRoundComplete: false,
      currentTargetIndex: 4,
      hintActive: false,
      hasTypedInRound: false,
    }
    expect(shouldFocusMemorizationPracticeInput(input)).toBe(true)
    expect(shouldBlurMemorizationPracticeInput(input)).toBe(false)
    expect(shouldScrollBlankAfterInputFocus(input)).toBe(false)
  })

  it('scrolls after focus once the user has typed in a type round', () => {
    const input = {
      phase: activeRound,
      practiceMode: 'type' as const,
      isRoundComplete: false,
      currentTargetIndex: 4,
      hintActive: false,
      hasTypedInRound: true,
    }
    expect(shouldScrollBlankAfterInputFocus(input)).toBe(true)
    expect(shouldScrollBlankForActiveTarget(input)).toBe(true)
  })

  it('scrolls word mode blanks without requiring typed-in state', () => {
    const input = {
      phase: activeRound,
      practiceMode: 'word' as const,
      isRoundComplete: false,
      currentTargetIndex: 1,
      hintActive: false,
      hasTypedInRound: false,
    }
    expect(shouldScrollBlankForActiveTarget(input)).toBe(true)
    expect(shouldScrollBlankAfterInputFocus(input)).toBe(false)
  })

  it('blurs input when practice leaves the active keyboard path', () => {
    const input = {
      phase: MEMORIZATION_PRACTICE_PHASE_INTRO,
      practiceMode: 'type' as const,
      isRoundComplete: false,
      currentTargetIndex: 4,
      hintActive: false,
      hasTypedInRound: true,
    }
    expect(shouldBlurMemorizationPracticeInput(input)).toBe(true)
    expect(shouldFocusMemorizationPracticeInput(input)).toBe(false)
  })

  it('skips inset-delay scroll for reorder mode', () => {
    const input = {
      phase: activeRound,
      practiceMode: 'reorder' as const,
      isRoundComplete: false,
      currentTargetIndex: 0,
      hintActive: false,
      hasTypedInRound: true,
    }
    expect(memorizationPracticeKeyboardInsetScrollDelayMs(input)).toBeNull()
  })
})
