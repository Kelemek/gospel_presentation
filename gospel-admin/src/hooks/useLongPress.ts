import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

export const DEFAULT_LONG_PRESS_MS = 1000
export const DEFAULT_LONG_PRESS_MOVE_THRESHOLD_PX = 10

export interface UseLongPressOptions {
  onLongPress: () => void
  delayMs?: number
  moveThresholdPx?: number
  disabled?: boolean
}

export interface LongPressHandlers {
  /** Prefer on a parent that wraps the whole hit target (capture phase, no stopPropagation). */
  onPointerDownCapture: (e: React.PointerEvent) => void
  onTouchStartCapture: (e: React.TouchEvent) => void
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

type DocumentListeners = {
  onPointerMove: (e: PointerEvent) => void
  onPointerUp: (e: PointerEvent) => void
  onPointerCancel: (e: PointerEvent) => void
  onTouchMove: (e: TouchEvent) => void
  onTouchEnd: (e: TouchEvent) => void
  onTouchCancel: (e: TouchEvent) => void
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
  const holdingRef = useRef(false)
  const docListenersRef = useRef<DocumentListeners | null>(null)
  const onLongPressRef = useRef(onLongPress)

  useLayoutEffect(() => {
    onLongPressRef.current = onLongPress
  }, [onLongPress])

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const detachDocumentListeners = useCallback(() => {
    const listeners = docListenersRef.current
    if (!listeners) return
    document.removeEventListener('pointermove', listeners.onPointerMove)
    document.removeEventListener('pointerup', listeners.onPointerUp)
    document.removeEventListener('pointercancel', listeners.onPointerCancel)
    document.removeEventListener('touchmove', listeners.onTouchMove)
    document.removeEventListener('touchend', listeners.onTouchEnd)
    document.removeEventListener('touchcancel', listeners.onTouchCancel)
    docListenersRef.current = null
  }, [])

  const checkMove = useCallback(
    (x: number, y: number) => {
      const start = startRef.current
      if (!start || !timeoutRef.current) return
      if (distance(start.x, start.y, x, y) > moveThresholdPx) {
        holdingRef.current = false
        clearTimer()
        startRef.current = null
        triggeredRef.current = false
        detachDocumentListeners()
      }
    },
    [clearTimer, moveThresholdPx, detachDocumentListeners]
  )

  const finishHold = useCallback(
    (e?: { preventDefault?: () => void; stopPropagation?: () => void }) => {
      if (!holdingRef.current && !timeoutRef.current && !triggeredRef.current) {
        return
      }
      holdingRef.current = false
      detachDocumentListeners()
      clearTimer()
      if (triggeredRef.current) {
        e?.preventDefault?.()
        e?.stopPropagation?.()
      }
      startRef.current = null
      triggeredRef.current = false
    },
    [clearTimer, detachDocumentListeners]
  )

  const cancel = useCallback(() => {
    finishHold()
  }, [finishHold])

  const attachDocumentListeners = useCallback(() => {
    detachDocumentListeners()
    const listeners: DocumentListeners = {
      onPointerMove: (e) => {
        if (!holdingRef.current) return
        checkMove(e.clientX, e.clientY)
      },
      onPointerUp: (e) => {
        if (!holdingRef.current) return
        finishHold(e)
      },
      onPointerCancel: () => {
        if (!holdingRef.current) return
        cancel()
      },
      onTouchMove: (e) => {
        if (!holdingRef.current) return
        const touch = e.touches[0]
        if (!touch) return
        checkMove(touch.clientX, touch.clientY)
      },
      onTouchEnd: (e) => {
        if (!holdingRef.current) return
        finishHold(e)
      },
      onTouchCancel: () => {
        if (!holdingRef.current) return
        cancel()
      },
    }
    docListenersRef.current = listeners
    document.addEventListener('pointermove', listeners.onPointerMove)
    document.addEventListener('pointerup', listeners.onPointerUp)
    document.addEventListener('pointercancel', listeners.onPointerCancel)
    document.addEventListener('touchmove', listeners.onTouchMove, { passive: true })
    document.addEventListener('touchend', listeners.onTouchEnd)
    document.addEventListener('touchcancel', listeners.onTouchCancel)
  }, [checkMove, finishHold, cancel, detachDocumentListeners])

  const startHold = useCallback(
    (x: number, y: number) => {
      if (disabled) return
      finishHold()
      startRef.current = { x, y }
      triggeredRef.current = false
      holdingRef.current = true
      attachDocumentListeners()
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null
        if (!holdingRef.current) return
        triggeredRef.current = true
        onLongPressRef.current()
      }, delayMs)
    },
    [disabled, finishHold, delayMs, attachDocumentListeners]
  )

  useEffect(() => () => finishHold(), [finishHold])

  const onPointerDownCapture = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || (e.button ?? 0) !== 0) return
      startHold(e.clientX, e.clientY)
    },
    [disabled, startHold]
  )

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || (e.button ?? 0) !== 0) return
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
      finishHold(e)
    },
    [finishHold]
  )

  const onPointerCancel = useCallback(() => {
    cancel()
  }, [cancel])

  const onTouchStartCapture = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return
      const touch = e.changedTouches[0] ?? e.touches[0]
      if (!touch) return
      startHold(touch.clientX, touch.clientY)
    },
    [disabled, startHold]
  )

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return
      const touch = e.changedTouches[0] ?? e.touches[0]
      if (!touch) return
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
      finishHold(e)
    },
    [finishHold]
  )

  const onTouchCancel = useCallback(() => {
    cancel()
  }, [cancel])

  return {
    onPointerDownCapture,
    onTouchStartCapture,
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
