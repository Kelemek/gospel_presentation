import { useCallback, useRef } from 'react'

export const DEFAULT_LONG_PRESS_MS = 1000
export const DEFAULT_LONG_PRESS_MOVE_THRESHOLD_PX = 10

export interface UseLongPressOptions {
  onLongPress: () => void
  delayMs?: number
  moveThresholdPx?: number
  disabled?: boolean
}

export interface LongPressHandlers {
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  onPointerCancel: (e: React.PointerEvent) => void
  onTouchStart: (e: React.TouchEvent) => void
  onTouchMove: (e: React.TouchEvent) => void
  onTouchEnd: (e: React.TouchEvent) => void
  onTouchCancel: (e: React.TouchEvent) => void
}

function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1
  const dy = y2 - y1
  return Math.sqrt(dx * dx + dy * dy)
}

export function useLongPress({
  onLongPress,
  delayMs = DEFAULT_LONG_PRESS_MS,
  moveThresholdPx = DEFAULT_LONG_PRESS_MOVE_THRESHOLD_PX,
  disabled = false,
}: UseLongPressOptions): LongPressHandlers {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const triggeredRef = useRef(false)

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const cancel = useCallback(() => {
    clearTimer()
    startRef.current = null
    triggeredRef.current = false
  }, [clearTimer])

  const startHold = useCallback(
    (x: number, y: number) => {
      if (disabled) return
      cancel()
      startRef.current = { x, y }
      triggeredRef.current = false
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null
        triggeredRef.current = true
        onLongPress()
      }, delayMs)
    },
    [cancel, delayMs, disabled, onLongPress]
  )

  const checkMove = useCallback(
    (x: number, y: number) => {
      const start = startRef.current
      if (!start || !timeoutRef.current) return
      if (distance(start.x, start.y, x, y) > moveThresholdPx) {
        cancel()
      }
    },
    [cancel, moveThresholdPx]
  )

  const endHold = useCallback(
    (e: { preventDefault?: () => void; stopPropagation?: () => void }) => {
      clearTimer()
      if (triggeredRef.current) {
        e.preventDefault?.()
        e.stopPropagation?.()
      }
      startRef.current = null
      triggeredRef.current = false
    },
    [clearTimer]
  )

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || (e.button ?? 0) !== 0) return
      e.stopPropagation?.()
      startHold(e.clientX, e.clientY)
    },
    [disabled, startHold]
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      checkMove(e.clientX, e.clientY)
    },
    [checkMove]
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      endHold(e)
    },
    [endHold]
  )

  const onPointerCancel = useCallback(() => {
    cancel()
  }, [cancel])

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return
      const touch = e.changedTouches[0] ?? e.touches[0]
      if (!touch) return
      e.stopPropagation?.()
      startHold(touch.clientX, touch.clientY)
    },
    [disabled, startHold]
  )

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.changedTouches[0] ?? e.touches[0]
      if (!touch) return
      checkMove(touch.clientX, touch.clientY)
    },
    [checkMove]
  )

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      endHold(e)
    },
    [endHold]
  )

  const onTouchCancel = useCallback(() => {
    cancel()
  }, [cancel])

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
  }
}
