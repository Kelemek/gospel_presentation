'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'

export const PASSAGE_SWIPE_COMMIT_RATIO = 0.5
export const PASSAGE_SWIPE_DIRECTION_LOCK_PX = 12
export const PASSAGE_SWIPE_ANIMATION_MS = 280
/** iOS-style deceleration curve (similar to Mail row animations). */
export const PASSAGE_SWIPE_EASING = 'cubic-bezier(0.22, 0.61, 0.36, 1)'
const RUBBER_BAND_FACTOR = 0.35

export type PassageSwipePhase = 'idle' | 'dragging' | 'exiting' | 'entering'
export type PassageSwipeUnderlaySide = 'left' | 'right' | null

export interface UsePassageSwipeNavOptions {
  containerWidth: number
  canGoNext: boolean
  canGoPrevious: boolean
  onNext?: () => void
  onPrevious?: () => void
  disabled?: boolean
  contentReady?: boolean
  contentKey?: string
}

export interface PassageSwipeNavPointerHandlers {
  onPointerDown: (e: ReactPointerEvent) => void
  onPointerMove: (e: ReactPointerEvent) => void
  onPointerUp: (e: ReactPointerEvent) => void
  onPointerCancel: (e: ReactPointerEvent) => void
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function applyRubberBand(
  offset: number,
  canGoNext: boolean,
  canGoPrevious: boolean
): number {
  if (offset < 0 && !canGoNext) return offset * RUBBER_BAND_FACTOR
  if (offset > 0 && !canGoPrevious) return offset * RUBBER_BAND_FACTOR
  return offset
}

function offsetsForDrag(
  dx: number,
  width: number,
  canGoNext: boolean,
  canGoPrevious: boolean
): {
  current: number
  underlay: number | null
  underlaySide: PassageSwipeUnderlaySide
} {
  const current = applyRubberBand(dx, canGoNext, canGoPrevious)

  if (current < 0 && canGoNext) {
    return { current, underlay: width + current, underlaySide: 'right' }
  }
  if (current > 0 && canGoPrevious) {
    return { current, underlay: -width + current, underlaySide: 'left' }
  }
  return { current, underlay: null, underlaySide: null }
}

export function usePassageSwipeNav({
  containerWidth,
  canGoNext,
  canGoPrevious,
  onNext,
  onPrevious,
  disabled = false,
  contentReady = true,
  contentKey = '',
}: UsePassageSwipeNavOptions): {
  currentOffsetX: number
  underlayOffsetX: number | null
  underlaySide: PassageSwipeUnderlaySide
  phase: PassageSwipePhase
  transitionEnabled: boolean
  isSwipeActive: boolean
  canDragNavigate: boolean
  pointerHandlers: PassageSwipeNavPointerHandlers
  onTransitionEnd: (propertyName: string) => void
} {
  const [currentOffsetX, setCurrentOffsetX] = useState(0)
  const [underlayOffsetX, setUnderlayOffsetX] = useState<number | null>(null)
  const [underlaySide, setUnderlaySide] = useState<PassageSwipeUnderlaySide>(null)
  const [phase, setPhase] = useState<PassageSwipePhase>('idle')
  const [transitionEnabled, setTransitionEnabled] = useState(false)
  const [pendingNav, setPendingNavState] = useState<'next' | 'previous' | null>(null)

  const startRef = useRef({ x: 0, y: 0 })
  const axisRef = useRef<'horizontal' | 'vertical' | null>(null)
  const exitTargetRef = useRef({ current: 0, underlay: 0 as number | null })
  const currentOffsetXRef = useRef(0)
  const phaseRef = useRef<PassageSwipePhase>('idle')
  const pendingNavRef = useRef<'next' | 'previous' | null>(null)
  const exitCompletedRef = useRef(false)
  const contentKeyAtCommitRef = useRef<string | null>(null)
  const exitFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activePointerIdRef = useRef<number | null>(null)
  const pointerCapturedRef = useRef(false)

  const width = Math.max(containerWidth, 1)

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  const setPendingNav = useCallback((value: 'next' | 'previous' | null) => {
    pendingNavRef.current = value
    setPendingNavState(value)
  }, [])

  const setPhaseSync = useCallback((value: PassageSwipePhase) => {
    phaseRef.current = value
    setPhase(value)
  }, [])

  const clearExitFallback = useCallback(() => {
    if (exitFallbackRef.current !== null) {
      clearTimeout(exitFallbackRef.current)
      exitFallbackRef.current = null
    }
  }, [])

  const setOffsets = useCallback(
    (
      current: number,
      underlay: number | null,
      side: PassageSwipeUnderlaySide
    ) => {
      currentOffsetXRef.current = current
      setCurrentOffsetX(current)
      setUnderlayOffsetX(underlay)
      setUnderlaySide(side)
    },
    []
  )

  const resetGesture = useCallback(() => {
    axisRef.current = null
    activePointerIdRef.current = null
    pointerCapturedRef.current = false
  }, [])

  const acquirePointerCapture = useCallback((e: ReactPointerEvent) => {
    if (pointerCapturedRef.current) return
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture?.(e.pointerId)
    pointerCapturedRef.current = true
  }, [])

  const releasePointerCaptureIfHeld = useCallback((e: ReactPointerEvent) => {
    if (!pointerCapturedRef.current) return
    const target = e.currentTarget as HTMLElement
    if (target.hasPointerCapture?.(e.pointerId)) {
      target.releasePointerCapture(e.pointerId)
    }
    pointerCapturedRef.current = false
  }, [])

  const snapTo = useCallback(
    (
      current: number,
      underlay: number | null,
      side: PassageSwipeUnderlaySide,
      withTransition: boolean
    ) => {
      setTransitionEnabled(withTransition)
      setOffsets(current, underlay, side)
    },
    [setOffsets]
  )

  const runEnterAnimation = useCallback(
    (direction: 'next' | 'previous') => {
      const startOffset = direction === 'next' ? width : -width
      setTransitionEnabled(false)
      setOffsets(startOffset, null, null)
      setPhaseSync('entering')
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTransitionEnabled(true)
          setOffsets(0, null, null)
        })
      })
    },
    [width, setOffsets, setPhaseSync]
  )

  const completeExit = useCallback(() => {
    clearExitFallback()
    const nav = pendingNavRef.current
    if (!nav) return

    if (nav === 'next') {
      onNext?.()
    } else {
      onPrevious?.()
    }

    exitCompletedRef.current = true
    setPhaseSync('idle')
    // Keep current off-screen and underlay at 0 (Mail-style reveal) until new content loads.
  }, [onNext, onPrevious, clearExitFallback, setPhaseSync])

  const scheduleExitFallback = useCallback(() => {
    clearExitFallback()
    exitFallbackRef.current = setTimeout(() => {
      exitFallbackRef.current = null
      if (phaseRef.current === 'exiting' && pendingNavRef.current) {
        completeExit()
      }
    }, PASSAGE_SWIPE_ANIMATION_MS + 80)
  }, [clearExitFallback, completeExit])

  useEffect(() => {
    if (!pendingNav || !contentReady || !exitCompletedRef.current) return
    if (contentKey === contentKeyAtCommitRef.current) return

    const direction = pendingNav
    setPendingNav(null)
    exitCompletedRef.current = false

    queueMicrotask(() => {
      if (prefersReducedMotion()) {
        setOffsets(0, null, null)
        setPhaseSync('idle')
        setTransitionEnabled(false)
        return
      }
      runEnterAnimation(direction)
    })
  }, [pendingNav, contentReady, contentKey, runEnterAnimation, setOffsets, setPendingNav, setPhaseSync])

  /** Reset if parent did not change contentKey after navigation (mocks / no-op nav). */
  useEffect(() => {
    if (!pendingNav || !exitCompletedRef.current || !contentReady) return
    if (contentKey !== contentKeyAtCommitRef.current) return

    const id = window.setTimeout(() => {
      if (
        pendingNavRef.current &&
        exitCompletedRef.current &&
        contentKey === contentKeyAtCommitRef.current
      ) {
        setPendingNav(null)
        exitCompletedRef.current = false
        setTransitionEnabled(false)
        setOffsets(0, null, null)
        setPhaseSync('idle')
      }
    }, 50)

    return () => clearTimeout(id)
  }, [pendingNav, contentReady, contentKey, setOffsets, setPendingNav, setPhaseSync])

  useEffect(() => () => clearExitFallback(), [clearExitFallback])

  const onTransitionEnd = useCallback(
    (propertyName: string) => {
      if (propertyName && propertyName !== 'transform') return

      const currentPhase = phaseRef.current

      if (currentPhase === 'exiting' && pendingNavRef.current) {
        completeExit()
        return
      }

      if (currentPhase === 'entering' && Math.abs(currentOffsetXRef.current) < 2) {
        setPhaseSync('idle')
        setTransitionEnabled(false)
      }

      if (
        currentPhase === 'idle' &&
        Math.abs(currentOffsetXRef.current) < 2 &&
        transitionEnabled
      ) {
        setTransitionEnabled(false)
      }
    },
    [completeExit, transitionEnabled, setPhaseSync]
  )

  const commitNavigation = useCallback(
    (direction: 'next' | 'previous') => {
      if (direction === 'next' && (!canGoNext || !onNext)) return
      if (direction === 'previous' && (!canGoPrevious || !onPrevious)) return

      if (prefersReducedMotion()) {
        if (direction === 'next') onNext?.()
        else onPrevious?.()
        return
      }

      const currentTarget = direction === 'next' ? -width : width
      const underlayTarget = 0
      const side: PassageSwipeUnderlaySide = direction === 'next' ? 'right' : 'left'

      exitTargetRef.current = { current: currentTarget, underlay: underlayTarget }
      contentKeyAtCommitRef.current = contentKey
      exitCompletedRef.current = false
      setPendingNav(direction)
      setPhaseSync('exiting')
      snapTo(currentTarget, underlayTarget, side, true)
      scheduleExitFallback()
    },
    [
      canGoNext,
      canGoPrevious,
      onNext,
      onPrevious,
      width,
      snapTo,
      contentKey,
      scheduleExitFallback,
      setPhaseSync,
      setPendingNav,
    ]
  )

  const applyDragOffset = useCallback(
    (dx: number) => {
      const { current, underlay, underlaySide: side } = offsetsForDrag(
        dx,
        width,
        canGoNext,
        canGoPrevious
      )
      setPhaseSync('dragging')
      setTransitionEnabled(false)
      setOffsets(current, underlay, side)
    },
    [width, canGoNext, canGoPrevious, setOffsets, setPhaseSync]
  )

  const clearStalePendingNav = useCallback(() => {
    if (
      !pendingNavRef.current ||
      !exitCompletedRef.current ||
      phaseRef.current !== 'idle' ||
      !contentReady ||
      contentKey !== contentKeyAtCommitRef.current
    ) {
      return
    }
    setPendingNav(null)
    exitCompletedRef.current = false
    setTransitionEnabled(false)
    setOffsets(0, null, null)
    setPhaseSync('idle')
  }, [contentReady, contentKey, setOffsets, setPendingNav, setPhaseSync])

  const beginGesture = useCallback(
    (x: number, y: number) => {
      startRef.current = { x, y }
      axisRef.current = null
      setTransitionEnabled(false)
    },
    []
  )

  const moveGesture = useCallback(
    (e: ReactPointerEvent) => {
      const dx = e.clientX - startRef.current.x
      const dy = e.clientY - startRef.current.y

      if (axisRef.current === null) {
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < PASSAGE_SWIPE_DIRECTION_LOCK_PX) return
        if (Math.abs(dx) > Math.abs(dy)) {
          axisRef.current = 'horizontal'
          acquirePointerCapture(e)
          e.preventDefault()
        } else {
          axisRef.current = 'vertical'
          activePointerIdRef.current = null
          return
        }
      }

      if (axisRef.current !== 'horizontal') return

      e.preventDefault()
      applyDragOffset(dx)
    },
    [applyDragOffset, acquirePointerCapture]
  )

  const finishGesture = useCallback(
    (endPoint: { x: number; y: number } | null) => {
      if (disabled || phaseRef.current === 'exiting' || phaseRef.current === 'entering') {
        resetGesture()
        return
      }
      if (pendingNavRef.current) {
        resetGesture()
        return
      }

      if (endPoint && axisRef.current === null) {
        const dx = endPoint.x - startRef.current.x
        const dy = endPoint.y - startRef.current.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist >= PASSAGE_SWIPE_DIRECTION_LOCK_PX && Math.abs(dx) > Math.abs(dy)) {
          axisRef.current = 'horizontal'
          applyDragOffset(dx)
        }
      }

      if (axisRef.current !== 'horizontal') {
        resetGesture()
        return
      }

      const current = currentOffsetXRef.current

      if (prefersReducedMotion()) {
        if (current <= -width * PASSAGE_SWIPE_COMMIT_RATIO && canGoNext) {
          onNext?.()
        } else if (current >= width * PASSAGE_SWIPE_COMMIT_RATIO && canGoPrevious) {
          onPrevious?.()
        }
        setOffsets(0, null, null)
        setPhaseSync('idle')
        resetGesture()
        return
      }

      if (current <= -width * PASSAGE_SWIPE_COMMIT_RATIO && canGoNext) {
        commitNavigation('next')
      } else if (current >= width * PASSAGE_SWIPE_COMMIT_RATIO && canGoPrevious) {
        commitNavigation('previous')
      } else {
        setPhaseSync('idle')
        snapTo(0, null, null, true)
      }

      resetGesture()
    },
    [
      disabled,
      width,
      canGoNext,
      canGoPrevious,
      onNext,
      onPrevious,
      commitNavigation,
      snapTo,
      resetGesture,
      applyDragOffset,
      setOffsets,
      setPhaseSync,
    ]
  )

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (disabled || phaseRef.current === 'exiting' || phaseRef.current === 'entering') {
        return
      }
      // Primary button only (mouse left-click; touch/pen contact).
      if (e.button !== 0) return

      if (pendingNavRef.current) {
        clearStalePendingNav()
        if (pendingNavRef.current) return
      }

      activePointerIdRef.current = e.pointerId
      beginGesture(e.clientX, e.clientY)
    },
    [disabled, clearStalePendingNav, beginGesture]
  )

  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      if (activePointerIdRef.current !== e.pointerId) return
      if (disabled || phaseRef.current === 'exiting' || phaseRef.current === 'entering') {
        return
      }
      if (pendingNavRef.current) return

      moveGesture(e)
    },
    [disabled, moveGesture]
  )

  const onPointerUp = useCallback(
    (e: ReactPointerEvent) => {
      if (activePointerIdRef.current !== e.pointerId) return

      releasePointerCaptureIfHeld(e)
      finishGesture({ x: e.clientX, y: e.clientY })
    },
    [finishGesture, releasePointerCaptureIfHeld]
  )

  const onPointerCancel = useCallback(
    (e: ReactPointerEvent) => {
      if (activePointerIdRef.current !== e.pointerId) return

      releasePointerCaptureIfHeld(e)
      if (phaseRef.current === 'dragging') {
        setPhaseSync('idle')
        snapTo(0, null, null, true)
      }
      resetGesture()
    },
    [snapTo, resetGesture, setPhaseSync, releasePointerCaptureIfHeld]
  )

  const isSwipeActive =
    phase === 'dragging' ||
    phase === 'exiting' ||
    phase === 'entering' ||
    pendingNav !== null

  const canDragNavigate = !disabled && (canGoNext || canGoPrevious)

  return {
    currentOffsetX,
    underlayOffsetX,
    underlaySide,
    phase,
    transitionEnabled,
    isSwipeActive,
    canDragNavigate,
    pointerHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
    onTransitionEnd,
  }
}
