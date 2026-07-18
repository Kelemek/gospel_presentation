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
    })

    act(() => {
      result.current.resetRoundErrors()
    })
    expect(result.current.wrongAttemptsInRound).toBe(0)
  })

  it('hydrates stored round errors', () => {
    const { result } = renderHook(() => useMemorizationRoundErrors(jest.fn()))

    act(() => {
      result.current.hydrateRoundErrors(3)
    })

    expect(result.current.wrongAttemptsInRound).toBe(3)
    expect(result.current.wrongAttemptsInRoundRef.current).toBe(3)
  })
})
