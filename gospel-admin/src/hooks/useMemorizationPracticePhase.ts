import { useCallback, useLayoutEffect, useReducer, useRef } from 'react'
import {
  MEMORIZATION_PRACTICE_PHASE_INTRO,
  memorizationPracticePhaseReducer,
  type MemorizationPracticePhase,
} from '@/lib/memorizationPracticePhase'

export function useMemorizationPracticePhase() {
  const [phase, dispatch] = useReducer(memorizationPracticePhaseReducer, MEMORIZATION_PRACTICE_PHASE_INTRO)
  const phaseRef = useRef<MemorizationPracticePhase>(phase)

  useLayoutEffect(() => {
    phaseRef.current = phase
  }, [phase])

  const resetIntro = useCallback(() => {
    dispatch({ type: 'resetIntro' })
  }, [])

  const startActiveRound = useCallback((roundIndex: number) => {
    dispatch({ type: 'startActiveRound', roundIndex })
  }, [])

  const completeRound = useCallback((roundIndex: number, hadErrors: boolean) => {
    dispatch({ type: 'completeRound', roundIndex, hadErrors })
  }, [])

  const finish = useCallback((message: string) => {
    dispatch({ type: 'finish', message })
  }, [])

  const hydrateRoundComplete = useCallback((roundIndex: number, hadErrors: boolean) => {
    dispatch({ type: 'hydrateRoundComplete', roundIndex, hadErrors })
  }, [])

  const hydrateActiveRound = useCallback((roundIndex: number) => {
    dispatch({ type: 'hydrateActiveRound', roundIndex })
  }, [])

  return {
    phase,
    phaseRef,
    resetIntro,
    startActiveRound,
    completeRound,
    finish,
    hydrateRoundComplete,
    hydrateActiveRound,
  }
}
