import { MEMORIZATION_FULL_HIDE_ROUND } from '@/lib/memorizationPracticeUtils'

export type MemorizationPracticePhase =
  | { kind: 'intro' }
  | { kind: 'activeRound'; roundIndex: number }
  | { kind: 'roundComplete'; roundIndex: number; hadErrors: boolean }
  | { kind: 'done'; message: string }

export const MEMORIZATION_PRACTICE_PHASE_INTRO: MemorizationPracticePhase = { kind: 'intro' }

export type MemorizationPracticePhaseAction =
  | { type: 'resetIntro' }
  | { type: 'startActiveRound'; roundIndex: number }
  | { type: 'completeRound'; roundIndex: number; hadErrors: boolean }
  | { type: 'finish'; message: string }
  | { type: 'hydrateRoundComplete'; roundIndex: number; hadErrors: boolean }
  | { type: 'hydrateActiveRound'; roundIndex: number }

export function memorizationPracticePhaseReducer(
  state: MemorizationPracticePhase,
  action: MemorizationPracticePhaseAction
): MemorizationPracticePhase {
  switch (action.type) {
    case 'resetIntro':
      return MEMORIZATION_PRACTICE_PHASE_INTRO
    case 'startActiveRound':
      return { kind: 'activeRound', roundIndex: action.roundIndex }
    case 'completeRound':
      return {
        kind: 'roundComplete',
        roundIndex: action.roundIndex,
        hadErrors: action.hadErrors,
      }
    case 'finish':
      return { kind: 'done', message: action.message }
    case 'hydrateRoundComplete':
      return {
        kind: 'roundComplete',
        roundIndex: action.roundIndex,
        hadErrors: action.hadErrors,
      }
    case 'hydrateActiveRound':
      return { kind: 'activeRound', roundIndex: action.roundIndex }
    default: {
      const _exhaustive: never = action
      return _exhaustive
    }
  }
}

export function isPracticePhaseIntro(phase: MemorizationPracticePhase): boolean {
  return phase.kind === 'intro'
}

export function isPracticePhaseActiveRound(phase: MemorizationPracticePhase): boolean {
  return phase.kind === 'activeRound'
}

export function isPracticePhaseRoundComplete(phase: MemorizationPracticePhase): boolean {
  return phase.kind === 'roundComplete'
}

export function isPracticePhaseDone(phase: MemorizationPracticePhase): boolean {
  return phase.kind === 'done'
}

/** Active or between-rounds UI inside the practice modal. */
export function isPracticePhaseInSession(phase: MemorizationPracticePhase): boolean {
  return phase.kind === 'activeRound' || phase.kind === 'roundComplete'
}

export function canPracticeRoundInteraction(phase: MemorizationPracticePhase): boolean {
  return phase.kind === 'activeRound'
}

export function practicePhaseRoundIndex(phase: MemorizationPracticePhase): number {
  if (phase.kind === 'activeRound' || phase.kind === 'roundComplete') {
    return phase.roundIndex
  }
  return 0
}

export function practicePhaseHadErrors(phase: MemorizationPracticePhase): boolean {
  return phase.kind === 'roundComplete' && phase.hadErrors
}

export function practicePhaseDoneMessage(phase: MemorizationPracticePhase): string {
  return phase.kind === 'done' ? phase.message : ''
}

export function isPracticePhaseFinalRound(phase: MemorizationPracticePhase): boolean {
  return practicePhaseRoundIndex(phase) >= MEMORIZATION_FULL_HIDE_ROUND
}

export function canShowPracticeListen(phase: MemorizationPracticePhase): boolean {
  return isPracticePhaseIntro(phase) || isPracticePhaseActiveRound(phase)
}
