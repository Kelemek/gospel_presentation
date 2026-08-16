import { renderHook, act } from '@testing-library/react'
import { useProfilePersistBeforeLeave } from '@/hooks/useProfilePersistBeforeLeave'

describe('useProfilePersistBeforeLeave', () => {
  it('forwards leave reason to the registered handler', () => {
    const handler = jest.fn()
    const { result } = renderHook(() => useProfilePersistBeforeLeave())

    act(() => result.current.registerPersistBeforeLeave(handler))
    act(() => result.current.persistReadingResumeBeforeLeave('scripture-open'))

    expect(handler).toHaveBeenCalledWith('scripture-open')
  })
})
