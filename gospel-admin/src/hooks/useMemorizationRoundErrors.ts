import { useCallback, useLayoutEffect, useRef, useState, type MutableRefObject } from 'react'

export interface UseMemorizationRoundErrorsResult {
  wrongAttemptsInRound: number
  wrongAttemptsInRoundRef: MutableRefObject<number>
  recordWrongAttempt: () => void
  resetRoundErrors: () => void
  hydrateRoundErrors: (wrongAttemptsInRound: number) => void
}

export function useMemorizationRoundErrors(
  onSessionWrongAttempt: () => void
): UseMemorizationRoundErrorsResult {
  const [wrongAttemptsInRound, setWrongAttemptsInRound] = useState(0)
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
  }, [])

  const hydrateRoundErrors = useCallback((errorsInRound: number) => {
    wrongAttemptsInRoundRef.current = errorsInRound
    setWrongAttemptsInRound(errorsInRound)
  }, [])

  useLayoutEffect(() => {
    wrongAttemptsInRoundRef.current = wrongAttemptsInRound
  }, [wrongAttemptsInRound])

  return {
    wrongAttemptsInRound,
    wrongAttemptsInRoundRef,
    recordWrongAttempt,
    resetRoundErrors,
    hydrateRoundErrors,
  }
}
