'use client'

import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react'

export const PASSAGE_SWIPE_COMMIT_RATIO = 0.5
export const PASSAGE_SWIPE_DIRECTION_LOCK_PX = 12
export const PASSAGE_SWIPE_ANIMATION_MS = 280
const RUBBER_BAND_FACTOR = 0.35

export type PassageSwipePhase = 'idle' | 'dragging' | 'exiting' | 'entering'

export interface UsePassageSwipeNavOptions {
  containerWidth: number
  canGoNext: boolean
  canGoPrevious: boolean
  onNext?: () => void
  onPrevious?: () => void
  disabled?: boolean
  /** When true after navigation, run enter animation from the opposite edge. */
  contentReady?: boolean
  /** Changes when passage content identity changes (e.g. reference). */
  contentKey?: string
}

export interface PassageSwipeNavTouchHandlers {
  onTouchStart: (e: TouchEvent) => void
  onTouchMove: (e: TouchEvent) => void
  onTouchEnd: (e: TouchEvent) => void
  onTouchCancel: (e: TouchEvent) => void
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function touchPoint(e: TouchEvent): { x: number; y: number } | null {
  const t = e.targetTouches[0] ?? e.changedTouches[0]
  if (!t) return null
  return { x: t.clientX, y: t.clientY }
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
  offsetX: number
  phase: PassageSwipePhase
  transitionEnabled: boolean
  isSwipeActive: boolean
  touchHandlers: PassageSwipeNavTouchHandlers
  onTransitionEnd: (propertyName: string) => void
} {
  const [offsetX, setOffsetX] = useState(0)
  const [phase, setPhase] = useState<PassageSwipePhase>('idle')
  const [transitionEnabled, setTransitionEnabled] = useState(false)
  const [pendingNav, setPendingNav] = useState<'next' | 'previous' | null>(null)

  const startRef = useRef({ x: 0, y: 0 })
  const axisRef = useRef<'horizontal' | 'vertical' | null>(null)
  const exitTargetRef = useRef(0)
  const offsetXRef = useRef(0)
  const exitCompletedRef = useRef(false)
  /** Set in commitNavigation only; null avoids matching mount-time contentKey after external nav. */
  const contentKeyAtCommitRef = useRef<string | null>(null)

  const width = Math.max(containerWidth, 1)

  const setOffsetWithRef = useCallback((value: number) => {
    offsetXRef.current = value
    setOffsetX(value)
  }, [])

  const resetGesture = useCallback(() => {
    axisRef.current = null
  }, [])

  const snapTo = useCallback(
    (target: number, withTransition: boolean) => {
      setTransitionEnabled(withTransition)
      setOffsetWithRef(target)
    },
    [setOffsetWithRef]
  )

  const runEnterAnimation = useCallback(
    (direction: 'next' | 'previous') => {
      const startOffset = direction === 'next' ? width : -width
      setTransitionEnabled(false)
      setOffsetWithRef(startOffset)
      setPhase('entering')
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTransitionEnabled(true)
          setOffsetWithRef(0)
        })
      })
    },
    [width, setOffsetWithRef]
  )

  const completeExit = useCallback(() => {
    if (!pendingNav) return
    if (pendingNav === 'next') {
      onNext?.()
    } else {
      onPrevious?.()
    }
    exitCompletedRef.current = true
    setPhase('idle')
    setTransitionEnabled(false)
    setOffsetWithRef(0)
  }, [pendingNav, onNext, onPrevious, setOffsetWithRef])

  useEffect(() => {
    if (!pendingNav || !contentReady || !exitCompletedRef.current) return
    if (contentKey === contentKeyAtCommitRef.current) return
    const direction = pendingNav
    setPendingNav(null)
    exitCompletedRef.current = false
    runEnterAnimation(direction)
  }, [pendingNav, contentReady, contentKey, runEnterAnimation])

  const onTransitionEnd = useCallback(
    (propertyName: string) => {
      if (propertyName && propertyName !== 'transform') return

      if (phase === 'exiting' && offsetX === exitTargetRef.current) {
        completeExit()
        return
      }

      if (phase === 'entering' && offsetX === 0) {
        setPhase('idle')
        setTransitionEnabled(false)
      }

      if (phase === 'idle' && offsetX === 0 && transitionEnabled) {
        setTransitionEnabled(false)
      }
    },
    [phase, offsetX, transitionEnabled, completeExit]
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

      const target = direction === 'next' ? -width : width
      exitTargetRef.current = target
      contentKeyAtCommitRef.current = contentKey
      exitCompletedRef.current = false
      setPendingNav(direction)
      setPhase('exiting')
      snapTo(target, true)
    },
    [canGoNext, canGoPrevious, onNext, onPrevious, width, snapTo, contentKey]
  )

  const onTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || phase === 'exiting' || phase === 'entering') return
      const point = touchPoint(e)
      if (!point) return
      startRef.current = point
      axisRef.current = null
      setTransitionEnabled(false)
    },
    [disabled, phase]
  )

  const onTouchMove = useCallback(
    (e: TouchEvent) => {
      if (disabled || phase === 'exiting' || phase === 'entering') return
      const point = touchPoint(e)
      if (!point) return

      const dx = point.x - startRef.current.x
      const dy = point.y - startRef.current.y

      if (axisRef.current === null) {
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < PASSAGE_SWIPE_DIRECTION_LOCK_PX) return
        if (Math.abs(dx) > Math.abs(dy)) {
          axisRef.current = 'horizontal'
        } else {
          axisRef.current = 'vertical'
          return
        }
      }

      if (axisRef.current !== 'horizontal') return

      e.preventDefault()
      const resisted = applyRubberBand(dx, canGoNext, canGoPrevious)
      setPhase('dragging')
      setOffsetWithRef(resisted)
    },
    [disabled, phase, canGoNext, canGoPrevious, setOffsetWithRef]
  )

  const finishTouch = useCallback(() => {
    if (disabled || phase === 'exiting' || phase === 'entering') {
      resetGesture()
      return
    }

    if (axisRef.current !== 'horizontal') {
      resetGesture()
      return
    }

    const current = offsetXRef.current

    if (prefersReducedMotion()) {
      if (current <= -width * PASSAGE_SWIPE_COMMIT_RATIO && canGoNext) {
        onNext?.()
      } else if (current >= width * PASSAGE_SWIPE_COMMIT_RATIO && canGoPrevious) {
        onPrevious?.()
      }
      setOffsetWithRef(0)
      setPhase('idle')
      resetGesture()
      return
    }

    if (current <= -width * PASSAGE_SWIPE_COMMIT_RATIO && canGoNext) {
      commitNavigation('next')
    } else if (current >= width * PASSAGE_SWIPE_COMMIT_RATIO && canGoPrevious) {
      commitNavigation('previous')
    } else {
      setPhase('idle')
      snapTo(0, true)
    }

    resetGesture()
  }, [
    disabled,
    phase,
    width,
    canGoNext,
    canGoPrevious,
    onNext,
    onPrevious,
    commitNavigation,
    snapTo,
    resetGesture,
    setOffsetWithRef,
  ])

  const onTouchEnd = useCallback(() => {
    finishTouch()
  }, [finishTouch])

  const onTouchCancel = useCallback(() => {
    if (phase === 'dragging') {
      setPhase('idle')
      snapTo(0, true)
    }
    resetGesture()
  }, [phase, snapTo, resetGesture])

  const isSwipeActive =
    phase === 'dragging' ||
    phase === 'exiting' ||
    phase === 'entering' ||
    pendingNav !== null

  return {
    offsetX,
    phase,
    transitionEnabled,
    isSwipeActive,
    touchHandlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel,
    },
    onTransitionEnd,
  }
}
