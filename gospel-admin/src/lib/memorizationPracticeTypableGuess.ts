import { shouldAutoRevealAfterWrongAttempts } from '@/lib/memorizationRoundAdvancePolicy'

export type ApplyMemorizationTypableGuessActions = {
  setRevealed: (update: (prev: Set<number>) => Set<number>) => void
  setConsecutiveWrong: (update: (prev: number) => number) => void
  setCorrectKeystrokesTotal: (update: (prev: number) => number) => void
  recordWrongAttempt: () => void
  flashErrorBriefly: () => void
}

export function applyMemorizationTypableGuess(
  tokenIndex: number,
  correct: boolean,
  strictMode: boolean,
  actions: ApplyMemorizationTypableGuessActions,
  onCorrectBeforeReveal?: () => void
) {
  if (correct) {
    onCorrectBeforeReveal?.()
    actions.setRevealed((prev) => {
      const next = new Set(prev)
      next.add(tokenIndex)
      return next
    })
    actions.setConsecutiveWrong(0)
    actions.setCorrectKeystrokesTotal((c) => c + 1)
    return
  }

  actions.recordWrongAttempt()
  actions.setConsecutiveWrong((c) => {
    const n = c + 1
    if (shouldAutoRevealAfterWrongAttempts(strictMode, n)) {
      actions.setRevealed((prev) => {
        const next = new Set(prev)
        next.add(tokenIndex)
        return next
      })
      actions.setCorrectKeystrokesTotal((ck) => ck + 1)
      return 0
    }
    return n
  })
  actions.flashErrorBriefly()
}
