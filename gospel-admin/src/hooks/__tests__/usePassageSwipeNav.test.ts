import { renderHook, act, waitFor } from '@testing-library/react'
import {
  PASSAGE_SWIPE_COMMIT_RATIO,
  PASSAGE_SWIPE_DIRECTION_LOCK_PX,
  resolvePassageSwipeAxis,
  usePassageSwipeNav,
} from '@/hooks/usePassageSwipeNav'

const POINTER_ID = 42

function createCaptureTarget() {
  return {
    setPointerCapture: jest.fn(),
    releasePointerCapture: jest.fn(),
    hasPointerCapture: jest.fn(() => true),
  }
}

function pointerAt(
  x: number,
  y: number,
  captureTarget = createCaptureTarget(),
  pointerType: 'mouse' | 'touch' = 'mouse'
) {
  return {
    clientX: x,
    clientY: y,
    pointerId: POINTER_ID,
    pointerType,
    button: 0,
    buttons: 1,
    preventDefault: jest.fn(),
    currentTarget: captureTarget,
  } as unknown as React.PointerEvent
}

describe('resolvePassageSwipeAxis', () => {
  it('returns null until movement exceeds lock threshold', () => {
    expect(resolvePassageSwipeAxis(5, 5)).toBeNull()
  })

  it('returns null for ambiguous diagonal movement', () => {
    expect(resolvePassageSwipeAxis(14, 18)).toBeNull()
  })

  it('prefers horizontal when dx clearly dominates', () => {
    expect(resolvePassageSwipeAxis(40, 18)).toBe('horizontal')
  })

  it('prefers vertical only when dy clearly dominates', () => {
    expect(resolvePassageSwipeAxis(8, 40)).toBe('vertical')
  })
})

describe('usePassageSwipeNav', () => {
  const width = 200
  const onNext = jest.fn()
  const onPrevious = jest.fn()
  let captureTarget: ReturnType<typeof createCaptureTarget>

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    captureTarget = createCaptureTarget()
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })) as unknown as typeof window.matchMedia
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('commits horizontal swipe after an initial ambiguous diagonal move', () => {
    const { result } = renderHook(() =>
      usePassageSwipeNav({
        containerWidth: width,
        canGoNext: true,
        canGoPrevious: true,
        onNext,
        onPrevious,
        contentReady: false,
      })
    )

    const { onPointerDown, onPointerMove, onPointerUp } = result.current.pointerHandlers
    const commitDx = width * PASSAGE_SWIPE_COMMIT_RATIO + 5

    act(() => {
      onPointerDown(pointerAt(200, 100, captureTarget))
      onPointerMove(pointerAt(212, 118, captureTarget))
      onPointerMove(pointerAt(200 - commitDx, 105, captureTarget))
      onPointerUp(pointerAt(200 - commitDx, 105, captureTarget))
    })

    expect(result.current.phase).toBe('exiting')
    act(() => {
      result.current.onTransitionEnd('transform')
    })
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('ignores mostly vertical movement (direction lock)', () => {
    const { result } = renderHook(() =>
      usePassageSwipeNav({
        containerWidth: width,
        canGoNext: true,
        canGoPrevious: true,
        onNext,
        onPrevious,
      })
    )

    const { onPointerDown, onPointerMove, onPointerUp } = result.current.pointerHandlers

    act(() => {
      onPointerDown(pointerAt(100, 100, captureTarget))
      onPointerMove(
        pointerAt(100, 100 + PASSAGE_SWIPE_DIRECTION_LOCK_PX + 20, captureTarget)
      )
      onPointerUp(pointerAt(100, 200, captureTarget))
    })

    expect(onNext).not.toHaveBeenCalled()
    expect(onPrevious).not.toHaveBeenCalled()
    expect(result.current.currentOffsetX).toBe(0)
  })

  it('does not capture pointer or preventDefault on pointerdown', () => {
    const { result } = renderHook(() =>
      usePassageSwipeNav({
        containerWidth: width,
        canGoNext: true,
        canGoPrevious: true,
        onNext,
        onPrevious,
      })
    )

    const down = pointerAt(200, 100, captureTarget, 'mouse')
    act(() => {
      result.current.pointerHandlers.onPointerDown(down)
    })

    expect(down.preventDefault).not.toHaveBeenCalled()
    expect(captureTarget.setPointerCapture).not.toHaveBeenCalled()
  })

  it('captures pointer and preventDefault on horizontal move (mouse)', () => {
    const { result } = renderHook(() =>
      usePassageSwipeNav({
        containerWidth: width,
        canGoNext: true,
        canGoPrevious: true,
        onNext,
        onPrevious,
      })
    )

    const down = pointerAt(200, 100, captureTarget, 'mouse')
    const move = pointerAt(120, 100, captureTarget, 'mouse')
    act(() => {
      result.current.pointerHandlers.onPointerDown(down)
      result.current.pointerHandlers.onPointerMove(move)
    })

    expect(move.preventDefault).toHaveBeenCalled()
    expect(captureTarget.setPointerCapture).toHaveBeenCalledWith(POINTER_ID)
  })

  it('does not capture pointer on mostly vertical movement', () => {
    const { result } = renderHook(() =>
      usePassageSwipeNav({
        containerWidth: width,
        canGoNext: true,
        canGoPrevious: true,
        onNext,
        onPrevious,
      })
    )

    act(() => {
      result.current.pointerHandlers.onPointerDown(pointerAt(100, 100, captureTarget))
      result.current.pointerHandlers.onPointerMove(
        pointerAt(100, 100 + PASSAGE_SWIPE_DIRECTION_LOCK_PX + 20, captureTarget)
      )
    })

    expect(captureTarget.setPointerCapture).not.toHaveBeenCalled()
  })

  it('detaches document listeners after vertical scroll is detected', () => {
    const removeSpy = jest.spyOn(document, 'removeEventListener')
    const { result } = renderHook(() =>
      usePassageSwipeNav({
        containerWidth: width,
        canGoNext: true,
        canGoPrevious: true,
        onNext,
        onPrevious,
      })
    )

    act(() => {
      result.current.pointerHandlers.onPointerDown(pointerAt(100, 100, captureTarget))
      result.current.pointerHandlers.onPointerMove(
        pointerAt(100, 100 + PASSAGE_SWIPE_DIRECTION_LOCK_PX + 20, captureTarget)
      )
    })

    expect(removeSpy).toHaveBeenCalledWith('pointermove', expect.any(Function), true)
    expect(removeSpy).toHaveBeenCalledWith('pointerup', expect.any(Function), true)
    expect(removeSpy).toHaveBeenCalledWith('pointercancel', expect.any(Function), true)

    removeSpy.mockClear()
    act(() => {
      document.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          clientX: 200,
          clientY: 200,
          pointerId: POINTER_ID,
        })
      )
    })

    expect(result.current.currentOffsetX).toBe(0)
    expect(removeSpy).not.toHaveBeenCalled()
    removeSpy.mockRestore()
  })

  it('ignores document pointer moves when disabled becomes true mid-gesture', () => {
    const { result, rerender } = renderHook(
      ({ disabled }: { disabled: boolean }) =>
        usePassageSwipeNav({
          containerWidth: width,
          canGoNext: true,
          canGoPrevious: true,
          onNext,
          onPrevious,
          disabled,
        }),
      { initialProps: { disabled: false } }
    )

    act(() => {
      result.current.pointerHandlers.onPointerDown(pointerAt(200, 100, captureTarget))
    })

    rerender({ disabled: true })

    act(() => {
      document.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          clientX: 120,
          clientY: 100,
          pointerId: POINTER_ID,
        })
      )
    })

    expect(result.current.currentOffsetX).toBe(0)
    expect(captureTarget.setPointerCapture).not.toHaveBeenCalled()
  })

  it('reveals underlay on the right while dragging toward next', () => {
    const { result } = renderHook(() =>
      usePassageSwipeNav({
        containerWidth: width,
        canGoNext: true,
        canGoPrevious: true,
        onNext,
        onPrevious,
      })
    )

    const { onPointerDown, onPointerMove } = result.current.pointerHandlers

    act(() => {
      onPointerDown(pointerAt(200, 100, captureTarget))
      onPointerMove(pointerAt(120, 100, captureTarget))
    })

    expect(result.current.currentOffsetX).toBe(-80)
    expect(result.current.underlaySide).toBe('right')
    expect(result.current.underlayOffsetX).toBe(120)
  })

  it('snaps back when release is under 50% width', () => {
    const { result } = renderHook(() =>
      usePassageSwipeNav({
        containerWidth: width,
        canGoNext: true,
        canGoPrevious: true,
        onNext,
        onPrevious,
      })
    )

    const { onPointerDown, onPointerMove, onPointerUp } = result.current.pointerHandlers
    const underCommit = width * PASSAGE_SWIPE_COMMIT_RATIO - 10

    act(() => {
      onPointerDown(pointerAt(200, 100, captureTarget))
      onPointerMove(pointerAt(200 - underCommit, 100, captureTarget))
      onPointerUp(pointerAt(200 - underCommit, 100, captureTarget))
    })

    expect(onNext).not.toHaveBeenCalled()
    expect(result.current.transitionEnabled).toBe(true)
  })

  it('commits next at 50% and calls onNext after exit transition', () => {
    const { result } = renderHook(() =>
      usePassageSwipeNav({
        containerWidth: width,
        canGoNext: true,
        canGoPrevious: true,
        onNext,
        onPrevious,
        contentReady: false,
      })
    )

    const { onPointerDown, onPointerMove, onPointerUp } = result.current.pointerHandlers
    const commitDx = width * PASSAGE_SWIPE_COMMIT_RATIO + 5

    act(() => {
      onPointerDown(pointerAt(200, 100, captureTarget))
      onPointerMove(pointerAt(200 - commitDx, 100, captureTarget))
      onPointerUp(pointerAt(200 - commitDx, 100, captureTarget))
    })

    expect(onNext).not.toHaveBeenCalled()
    expect(result.current.phase).toBe('exiting')
    expect(result.current.currentOffsetX).toBe(-width)
    expect(result.current.underlayOffsetX).toBe(0)

    act(() => {
      result.current.onTransitionEnd('transform')
    })

    expect(onNext).toHaveBeenCalledTimes(1)
    expect(result.current.currentOffsetX).toBe(-width)
    expect(onPrevious).not.toHaveBeenCalled()
  })

  it('calls onNext via exit fallback when transitionend does not fire', () => {
    const { result } = renderHook(() =>
      usePassageSwipeNav({
        containerWidth: width,
        canGoNext: true,
        canGoPrevious: true,
        onNext,
        onPrevious,
        contentReady: false,
      })
    )

    const { onPointerDown, onPointerMove, onPointerUp } = result.current.pointerHandlers
    const commitDx = width * PASSAGE_SWIPE_COMMIT_RATIO + 5

    act(() => {
      onPointerDown(pointerAt(200, 100, captureTarget))
      onPointerMove(pointerAt(200 - commitDx, 100, captureTarget))
      onPointerUp(pointerAt(200 - commitDx, 100, captureTarget))
    })

    act(() => {
      jest.advanceTimersByTime(400)
    })

    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('commits previous at 50% and calls onPrevious after exit transition', () => {
    const { result } = renderHook(() =>
      usePassageSwipeNav({
        containerWidth: width,
        canGoNext: true,
        canGoPrevious: true,
        onNext,
        onPrevious,
        contentReady: false,
      })
    )

    const { onPointerDown, onPointerMove, onPointerUp } = result.current.pointerHandlers
    const commitDx = width * PASSAGE_SWIPE_COMMIT_RATIO + 5

    act(() => {
      onPointerDown(pointerAt(0, 100, captureTarget))
      onPointerMove(pointerAt(commitDx, 100, captureTarget))
      onPointerUp(pointerAt(commitDx, 100, captureTarget))
    })

    expect(result.current.phase).toBe('exiting')
    expect(result.current.currentOffsetX).toBe(width)
    expect(result.current.underlaySide).toBe('left')

    act(() => {
      result.current.onTransitionEnd('transform')
    })

    expect(onPrevious).toHaveBeenCalledTimes(1)
  })

  it('commits on pointerUp without intermediate pointerMove (fast fling)', () => {
    const { result } = renderHook(() =>
      usePassageSwipeNav({
        containerWidth: width,
        canGoNext: true,
        canGoPrevious: true,
        onNext,
        onPrevious,
        contentReady: false,
      })
    )

    const { onPointerDown, onPointerUp } = result.current.pointerHandlers
    const commitDx = width * PASSAGE_SWIPE_COMMIT_RATIO + 5

    act(() => {
      onPointerDown(pointerAt(200, 100, captureTarget))
      onPointerUp(pointerAt(200 - commitDx, 100, captureTarget))
    })

    expect(result.current.phase).toBe('exiting')

    act(() => {
      result.current.onTransitionEnd('transform')
    })

    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('ignores non-primary mouse buttons', () => {
    const { result } = renderHook(() =>
      usePassageSwipeNav({
        containerWidth: width,
        canGoNext: true,
        canGoPrevious: true,
        onNext,
        onPrevious,
      })
    )

    const { onPointerDown } = result.current.pointerHandlers
    const commitDx = width * PASSAGE_SWIPE_COMMIT_RATIO + 5

    act(() => {
      onPointerDown({
        ...pointerAt(200, 100, captureTarget),
        button: 2,
      } as React.PointerEvent)
    })

    act(() => {
      result.current.pointerHandlers.onPointerMove(
        pointerAt(200 - commitDx, 100, captureTarget)
      )
      result.current.pointerHandlers.onPointerUp(
        pointerAt(200 - commitDx, 100, captureTarget)
      )
    })

    expect(onNext).not.toHaveBeenCalled()
    expect(result.current.phase).toBe('idle')
  })

  it('applies rubber-band resistance when navigation is blocked', () => {
    const { result } = renderHook(() =>
      usePassageSwipeNav({
        containerWidth: width,
        canGoNext: false,
        canGoPrevious: false,
        onNext,
        onPrevious,
      })
    )

    const { onPointerDown, onPointerMove } = result.current.pointerHandlers

    act(() => {
      onPointerDown(pointerAt(200, 100, captureTarget))
      onPointerMove(pointerAt(50, 100, captureTarget))
    })

    expect(Math.abs(result.current.currentOffsetX)).toBeLessThan(
      width * PASSAGE_SWIPE_COMMIT_RATIO
    )
    expect(result.current.underlayOffsetX).toBeNull()
  })

  it('runs enter animation after swipe when contentKey changed externally before the swipe', async () => {
    const commitDx = width * PASSAGE_SWIPE_COMMIT_RATIO + 5
    const keyA = 'John 3:16|verse|esv|'
    const keyB = 'John 3:17|verse|esv|'
    const keyC = 'John 3:18|verse|esv|'

    const { result, rerender } = renderHook(
      ({ contentKey, contentReady }) =>
        usePassageSwipeNav({
          containerWidth: width,
          canGoNext: true,
          canGoPrevious: true,
          onNext,
          onPrevious,
          contentReady,
          contentKey,
        }),
      {
        initialProps: { contentKey: keyA, contentReady: true },
      }
    )

    rerender({ contentKey: keyB, contentReady: true })

    act(() => {
      const { onPointerDown, onPointerMove, onPointerUp } = result.current.pointerHandlers
      onPointerDown(pointerAt(200, 100, captureTarget))
      onPointerMove(pointerAt(200 - commitDx, 100, captureTarget))
      onPointerUp(pointerAt(200 - commitDx, 100, captureTarget))
    })

    act(() => {
      result.current.onTransitionEnd('transform')
    })

    expect(onNext).toHaveBeenCalledTimes(1)

    rerender({ contentKey: keyC, contentReady: false })
    rerender({ contentKey: keyC, contentReady: true })

    await act(async () => {
      await Promise.resolve()
    })
    await waitFor(() => {
      expect(result.current.phase).toBe('entering')
    })
  })

  it('supports a second swipe after navigation when contentKey does not change (mock parent)', () => {
    const commitDx = width * PASSAGE_SWIPE_COMMIT_RATIO + 5
    const key = 'John 3:16|verse|esv|'

    const { result } = renderHook(() =>
      usePassageSwipeNav({
        containerWidth: width,
        canGoNext: true,
        canGoPrevious: true,
        onNext,
        onPrevious,
        contentReady: true,
        contentKey: key,
      })
    )

    const swipe = (startX: number, endX: number) => {
      const target = createCaptureTarget()
      const { onPointerDown, onPointerMove, onPointerUp } = result.current.pointerHandlers
      act(() => {
        onPointerDown(pointerAt(startX, 100, target))
        onPointerMove(pointerAt(endX, 100, target))
        onPointerUp(pointerAt(endX, 100, target))
      })
      act(() => {
        result.current.onTransitionEnd('transform')
      })
    }

    swipe(200, 200 - commitDx)
    expect(onNext).toHaveBeenCalledTimes(1)

    swipe(0, commitDx)
    expect(onPrevious).toHaveBeenCalledTimes(1)
  })

  it('calls navigation immediately when prefers-reduced-motion is set', () => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })) as unknown as typeof window.matchMedia

    const { result } = renderHook(() =>
      usePassageSwipeNav({
        containerWidth: width,
        canGoNext: true,
        canGoPrevious: true,
        onNext,
        onPrevious,
      })
    )

    const { onPointerDown, onPointerMove, onPointerUp } = result.current.pointerHandlers
    const commitDx = width * PASSAGE_SWIPE_COMMIT_RATIO + 5

    act(() => {
      onPointerDown(pointerAt(200, 100, captureTarget))
      onPointerMove(pointerAt(200 - commitDx, 100, captureTarget))
      onPointerUp(pointerAt(200 - commitDx, 100, captureTarget))
    })

    expect(onNext).toHaveBeenCalledTimes(1)
    expect(result.current.currentOffsetX).toBe(0)
    expect(result.current.phase).toBe('idle')
  })
})
