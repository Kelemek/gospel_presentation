import { renderHook, act } from '@testing-library/react'
import { useLongPress, DEFAULT_LONG_PRESS_MS } from '@/hooks/useLongPress'

describe('useLongPress', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('calls onLongPress after delay when pointer is held still', () => {
    const onLongPress = jest.fn()
    const { result } = renderHook(() => useLongPress({ onLongPress }))

    act(() => {
      result.current.onPointerDown({
        button: 0,
        clientX: 100,
        clientY: 200,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      } as unknown as React.PointerEvent)
    })

    act(() => {
      jest.advanceTimersByTime(DEFAULT_LONG_PRESS_MS)
    })

    expect(onLongPress).toHaveBeenCalledTimes(1)
  })

  it('does not call onLongPress when pointer moves beyond threshold', () => {
    const onLongPress = jest.fn()
    const { result } = renderHook(() => useLongPress({ onLongPress }))

    act(() => {
      result.current.onPointerDown({
        button: 0,
        clientX: 100,
        clientY: 200,
      } as unknown as React.PointerEvent)
      result.current.onPointerMove({
        clientX: 120,
        clientY: 200,
      } as unknown as React.PointerEvent)
    })

    act(() => {
      jest.advanceTimersByTime(DEFAULT_LONG_PRESS_MS)
    })

    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('does not call onLongPress when pointer is released early', () => {
    const onLongPress = jest.fn()
    const { result } = renderHook(() => useLongPress({ onLongPress }))

    act(() => {
      result.current.onPointerDown({
        button: 0,
        clientX: 100,
        clientY: 200,
      } as unknown as React.PointerEvent)
      result.current.onPointerUp({
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      } as unknown as React.PointerEvent)
    })

    act(() => {
      jest.advanceTimersByTime(DEFAULT_LONG_PRESS_MS)
    })

    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('does not start when disabled', () => {
    const onLongPress = jest.fn()
    const { result } = renderHook(() => useLongPress({ onLongPress, disabled: true }))

    act(() => {
      result.current.onPointerDown({
        button: 0,
        clientX: 100,
        clientY: 200,
      } as unknown as React.PointerEvent)
      jest.advanceTimersByTime(DEFAULT_LONG_PRESS_MS)
    })

    expect(onLongPress).not.toHaveBeenCalled()
  })
})
