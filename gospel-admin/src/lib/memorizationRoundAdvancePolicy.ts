/** Wrong guesses on a blank before Normal mode auto-reveals the answer. */
export const MEMORIZATION_MAX_WRONG_BEFORE_REVEAL = 3

export function shouldAutoRevealAfterWrongAttempts(
  strictMode: boolean,
  consecutiveWrong: number
): boolean {
  return !strictMode && consecutiveWrong >= MEMORIZATION_MAX_WRONG_BEFORE_REVEAL
}

export function shouldAutoCompleteFinalRound(wrongAttemptsInRound: number): boolean {
  return wrongAttemptsInRound === 0
}

export function canFinishPracticeFromAwaiting(
  awaitingRoundAdvance: boolean,
  isFinalRound: boolean,
  strictMode: boolean
): boolean {
  return awaitingRoundAdvance && isFinalRound && !strictMode
}

export function shouldBlockFinishPractice(
  awaitingRoundAdvance: boolean,
  isFinalRound: boolean,
  strictMode: boolean
): boolean {
  return awaitingRoundAdvance && !canFinishPracticeFromAwaiting(awaitingRoundAdvance, isFinalRound, strictMode)
}

export function memorizationRoundAdvanceShowsNextRound(params: {
  isFinalRound: boolean
  roundCompletedWithErrors: boolean
  strictMode: boolean
  wrongAttemptsInRound: number
}): boolean {
  const { isFinalRound, roundCompletedWithErrors, strictMode, wrongAttemptsInRound } = params
  if (isFinalRound) return false
  if (!roundCompletedWithErrors) return true
  return !(wrongAttemptsInRound > 0 && strictMode)
}

export function memorizationRoundAdvanceShowsFinishPractice(params: {
  awaitingRoundAdvance: boolean
  isFinalRound: boolean
  strictMode: boolean
}): boolean {
  return params.awaitingRoundAdvance && params.isFinalRound && !params.strictMode
}

export function memorizationRoundAdvanceShowsStrictErrorsBadge(params: {
  strictMode: boolean
  wrongAttemptsInRound: number
  awaitingRoundAdvance: boolean
}): boolean {
  return params.strictMode && params.wrongAttemptsInRound > 0 && !params.awaitingRoundAdvance
}

export function getMemorizationRoundCompleteInstruction(params: {
  isFinalRound: boolean
  showFinishPracticeOption: boolean
  roundIndex: number
}): string {
  const { isFinalRound, showFinishPracticeOption, roundIndex } = params
  if (isFinalRound) {
    if (showFinishPracticeOption) {
      return `Round ${roundIndex} complete — repeat this round or finish practice.`
    }
    return `Round ${roundIndex} complete — repeat this round until you finish with no errors.`
  }
  return `Round ${roundIndex} complete — repeat or continue to round ${roundIndex + 1}.`
}
