import { useCallback, useLayoutEffect, useRef, useState, type MutableRefObject } from 'react'

export interface UseMemorizationRoundErrorsResult {
  wrongAttemptsInRound: number
  roundCompletedWithErrors: boolean
  wrongAttemptsInRoundRef: MutableRefObject<number>
  recordWrongAttempt: () => void
  resetRoundErrors: () => void
  completeRoundAdvance: () => void
  hydrateBetweenRounds: (wrongAttemptsInRound: number) => void
  hydrateInRound: (wrongAttemptsInRound: number) => void
}

export function useMemorizationRoundErrors(
  onSessionWrongAttempt: () => void
): UseMemorizationRoundErrorsResult {
  const [wrongAttemptsInRound, setWrongAttemptsInRound] = useState(0)
  const [roundCompletedWithErrors, setRoundCompletedWithErrors] = useState(false)
  const wrongAttemptsInRoundRef = useRef(0)

  const recordWrongAttempt = useCallback(() => {
    onSessionWrongAttempt()
    setWrongAttemptsInRound((w) => {
      const next = w + 1
      wrongAttemptsInRoundRef.current = next
      return next
    })
  }, [onSessionWrongAttempt])

  const resetRoundErrors = useCallback(() => {
    wrongAttemptsInRoundRef.current = 0
    setWrongAttemptsInRound(0)
    setRoundCompletedWithErrors(false)
  }, [])

  const completeRoundAdvance = useCallback(() => {
    setRoundCompletedWithErrors(wrongAttemptsInRoundRef.current > 0)
  }, [])

  const hydrateBetweenRounds = useCallback((errorsInRound: number) => {
    wrongAttemptsInRoundRef.current = errorsInRound
    setWrongAttemptsInRound(errorsInRound)
    setRoundCompletedWithErrors(errorsInRound > 0)
  }, [])

  const hydrateInRound = useCallback((errorsInRound: number) => {
    wrongAttemptsInRoundRef.current = errorsInRound
    setWrongAttemptsInRound(errorsInRound)
    setRoundCompletedWithErrors(false)
  }, [])

  useLayoutEffect(() => {
    wrongAttemptsInRoundRef.current = wrongAttemptsInRound
  }, [wrongAttemptsInRound])

  return {
    wrongAttemptsInRound,
    roundCompletedWithErrors,
    wrongAttemptsInRoundRef,
    recordWrongAttempt,
    resetRoundErrors,
    completeRoundAdvance,
    hydrateBetweenRounds,
    hydrateInRound,
  }
}
