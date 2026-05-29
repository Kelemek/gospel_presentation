import { renderHook, act } from '@testing-library/react'
import {
  PASSAGE_SWIPE_COMMIT_RATIO,
  PASSAGE_SWIPE_DIRECTION_LOCK_PX,
  usePassageSwipeNav,
} from '@/hooks/usePassageSwipeNav'

function touchAt(x: number, y: number, kind: 'start' | 'move' | 'end') {
  const touch = { clientX: x, clientY: y }
  return {
    targetTouches: kind === 'end' ? [] : [touch],
    changedTouches: kind === 'end' ? [touch] : [],
    preventDefault: jest.fn(),
  } as unknown as React.TouchEvent
}

describe('usePassageSwipeNav', () => {
  const width = 200
  const onNext = jest.fn()
  const onPrevious = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })) as unknown as typeof window.matchMedia
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

    const { onTouchStart, onTouchMove, onTouchEnd } = result.current.touchHandlers

    act(() => {
      onTouchStart(touchAt(100, 100, 'start'))
      onTouchMove(
        touchAt(100, 100 + PASSAGE_SWIPE_DIRECTION_LOCK_PX + 20, 'move')
      )
      onTouchEnd(touchAt(100, 200, 'end'))
    })

    expect(onNext).not.toHaveBeenCalled()
    expect(onPrevious).not.toHaveBeenCalled()
    expect(result.current.offsetX).toBe(0)
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

    const { onTouchStart, onTouchMove, onTouchEnd } = result.current.touchHandlers
    const underCommit = width * PASSAGE_SWIPE_COMMIT_RATIO - 10

    act(() => {
      onTouchStart(touchAt(200, 100, 'start'))
      onTouchMove(touchAt(200 - underCommit, 100, 'move'))
      onTouchEnd(touchAt(200 - underCommit, 100, 'end'))
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

    const { onTouchStart, onTouchMove, onTouchEnd } = result.current.touchHandlers
    const commitDx = width * PASSAGE_SWIPE_COMMIT_RATIO + 5

    act(() => {
      onTouchStart(touchAt(200, 100, 'start'))
      onTouchMove(touchAt(200 - commitDx, 100, 'move'))
      onTouchEnd(touchAt(200 - commitDx, 100, 'end'))
    })

    expect(onNext).not.toHaveBeenCalled()
    expect(result.current.phase).toBe('exiting')
    expect(result.current.offsetX).toBe(-width)

    act(() => {
      result.current.onTransitionEnd('transform')
    })

    expect(onNext).toHaveBeenCalledTimes(1)
    expect(onPrevious).not.toHaveBeenCalled()
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

    const { onTouchStart, onTouchMove, onTouchEnd } = result.current.touchHandlers
    const commitDx = width * PASSAGE_SWIPE_COMMIT_RATIO + 5

    act(() => {
      onTouchStart(touchAt(0, 100, 'start'))
      onTouchMove(touchAt(commitDx, 100, 'move'))
      onTouchEnd(touchAt(commitDx, 100, 'end'))
    })

    expect(result.current.phase).toBe('exiting')
    expect(result.current.offsetX).toBe(width)

    act(() => {
      result.current.onTransitionEnd('transform')
    })

    expect(onPrevious).toHaveBeenCalledTimes(1)
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

    const { onTouchStart, onTouchMove } = result.current.touchHandlers

    act(() => {
      onTouchStart(touchAt(200, 100, 'start'))
      onTouchMove(touchAt(50, 100, 'move'))
    })

    expect(Math.abs(result.current.offsetX)).toBeLessThan(
      width * PASSAGE_SWIPE_COMMIT_RATIO
    )
  })

  it('runs enter animation after swipe when contentKey changed externally before the swipe', () => {
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
      const { onTouchStart, onTouchMove, onTouchEnd } = result.current.touchHandlers
      onTouchStart(touchAt(200, 100, 'start'))
      onTouchMove(touchAt(200 - commitDx, 100, 'move'))
      onTouchEnd(touchAt(200 - commitDx, 100, 'end'))
    })

    act(() => {
      result.current.onTransitionEnd('transform')
    })

    expect(onNext).toHaveBeenCalledTimes(1)

    rerender({ contentKey: keyC, contentReady: false })
    rerender({ contentKey: keyC, contentReady: true })

    expect(result.current.phase).toBe('entering')
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

    const { onTouchStart, onTouchMove, onTouchEnd } = result.current.touchHandlers
    const commitDx = width * PASSAGE_SWIPE_COMMIT_RATIO + 5

    act(() => {
      onTouchStart(touchAt(200, 100, 'start'))
      onTouchMove(touchAt(200 - commitDx, 100, 'move'))
      onTouchEnd(touchAt(200 - commitDx, 100, 'end'))
    })

    expect(onNext).toHaveBeenCalledTimes(1)
    expect(result.current.offsetX).toBe(0)
    expect(result.current.phase).toBe('idle')
  })
})
