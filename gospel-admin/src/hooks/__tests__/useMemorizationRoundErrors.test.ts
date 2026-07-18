/**
 * @jest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react'
import { useMemorizationRoundErrors } from '@/hooks/useMemorizationRoundErrors'

describe('useMemorizationRoundErrors', () => {
  it('records session and round wrong attempts', () => {
    const onSessionWrongAttempt = jest.fn()
    const { result } = renderHook(() => useMemorizationRoundErrors(onSessionWrongAttempt))

    act(() => {
      result.current.recordWrongAttempt()
    })

    expect(onSessionWrongAttempt).toHaveBeenCalledTimes(1)
    expect(result.current.wrongAttemptsInRound).toBe(1)
    expect(result.current.wrongAttemptsInRoundRef.current).toBe(1)
  })

  it('resets round errors when starting a new round', () => {
    const { result } = renderHook(() => useMemorizationRoundErrors(jest.fn()))

    act(() => {
      result.current.recordWrongAttempt()
      result.current.completeRoundAdvance()
    })
    expect(result.current.roundCompletedWithErrors).toBe(true)

    act(() => {
      result.current.resetRoundErrors()
    })
    expect(result.current.wrongAttemptsInRound).toBe(0)
    expect(result.current.roundCompletedWithErrors).toBe(false)
  })

  it('hydrates between-round snapshots with stored errors', () => {
    const { result } = renderHook(() => useMemorizationRoundErrors(jest.fn()))

    act(() => {
      result.current.hydrateBetweenRounds(3)
    })

    expect(result.current.wrongAttemptsInRound).toBe(3)
    expect(result.current.roundCompletedWithErrors).toBe(true)
    expect(result.current.wrongAttemptsInRoundRef.current).toBe(3)
  })
})
