import {
  isPracticePhaseActiveRound,
  isPracticePhaseInSession,
} from '@/lib/memorizationPracticePhase'
import type { MemorizationPracticePhase } from '@/lib/memorizationPracticePhase'
import { isKeyboardPracticeMode } from '@/lib/memorizationPracticeSessionHelpers'
import type { MemorizationPracticeMode } from '@/lib/verseMemorizationStorage'
import { isMemorizeAndroidWebHost } from '@/lib/memorizationViewportPlatform'

export type MemorizationPracticeTypingScrollPolicyInput = {
  phase: MemorizationPracticePhase
  practiceMode: MemorizationPracticeMode | null
  isRoundComplete: boolean
  currentTargetIndex: number | null
  hintActive: boolean
  hasTypedInRound: boolean
}

function isTypableKeyboardScrollMode(practiceMode: MemorizationPracticeMode | null): boolean {
  return practiceMode === 'type' || practiceMode === 'firstLetters'
}

export function shouldBlurMemorizationPracticeInput(
  input: MemorizationPracticeTypingScrollPolicyInput
): boolean {
  if (isPracticePhaseActiveRound(input.phase)) return false
  return (
    !isPracticePhaseInSession(input.phase) ||
    input.isRoundComplete ||
    input.currentTargetIndex === null ||
    input.hintActive ||
    !isKeyboardPracticeMode(input.practiceMode)
  )
}

export function shouldFocusMemorizationPracticeInput(
  input: MemorizationPracticeTypingScrollPolicyInput
): boolean {
  return (
    isPracticePhaseInSession(input.phase) &&
    !input.isRoundComplete &&
    input.currentTargetIndex !== null &&
    !input.hintActive &&
    isKeyboardPracticeMode(input.practiceMode)
  )
}

export function shouldScrollBlankAfterInputFocus(
  input: MemorizationPracticeTypingScrollPolicyInput
): boolean {
  return shouldFocusMemorizationPracticeInput(input) && input.hasTypedInRound && isTypableKeyboardScrollMode(input.practiceMode)
}

export function shouldScrollBlankForActiveTarget(
  input: MemorizationPracticeTypingScrollPolicyInput
): boolean {
  if (!isPracticePhaseActiveRound(input.phase) || input.currentTargetIndex === null) {
    return false
  }
  if (input.practiceMode === 'word') return true
  return isTypableKeyboardScrollMode(input.practiceMode) && input.hasTypedInRound
}

export function memorizationPracticeKeyboardInsetScrollDelayMs(
  input: MemorizationPracticeTypingScrollPolicyInput
): number | null {
  if (input.practiceMode === 'recite' || input.practiceMode === 'reorder') return null
  if (!isPracticePhaseActiveRound(input.phase) || input.currentTargetIndex === null) return null
  if (!input.hasTypedInRound) return null
  return isMemorizeAndroidWebHost() ? 120 : 80
}
