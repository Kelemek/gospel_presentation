'use client'

import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import {
  PASSAGE_SWIPE_ANIMATION_MS,
  usePassageSwipeNav,
} from '@/hooks/usePassageSwipeNav'

export interface ScripturePassageSwipeLayerProps {
  children: ReactNode
  canGoNext: boolean
  canGoPrevious: boolean
  onNext?: () => void
  onPrevious?: () => void
  disabled?: boolean
  contentReady?: boolean
  contentKey?: string
  className?: string
}

export default function ScripturePassageSwipeLayer({
  children,
  canGoNext,
  canGoPrevious,
  onNext,
  onPrevious,
  disabled = false,
  contentReady = true,
  contentKey = '',
  className,
}: ScripturePassageSwipeLayerProps) {
  const shellRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useLayoutEffect(() => {
    const el = shellRef.current
    if (!el) return

    const update = () => {
      setContainerWidth(el.clientWidth)
    }
    update()

    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const {
    offsetX,
    phase,
    transitionEnabled,
    isSwipeActive,
    touchHandlers,
    onTransitionEnd,
  } = usePassageSwipeNav({
    containerWidth,
    canGoNext,
    canGoPrevious,
    onNext,
    onPrevious,
    disabled,
    contentReady,
    contentKey,
  })

  const handleTransitionEnd = useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      onTransitionEnd(e.propertyName)
    },
    [onTransitionEnd]
  )

  const showPlaceholder = !contentReady && isSwipeActive

  return (
    <div
      ref={shellRef}
      className={`overflow-hidden touch-pan-y ${className ?? ''}`}
      data-tour="scripture-modal-passage-swipe"
      {...touchHandlers}
    >
      <div
        className="will-change-transform"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: transitionEnabled
            ? `transform ${PASSAGE_SWIPE_ANIMATION_MS}ms ease-out`
            : 'none',
        }}
        onTransitionEnd={handleTransitionEnd}
        data-phase={phase}
      >
        {showPlaceholder ? (
          <div className="flex items-center justify-center py-12 min-h-[120px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <span className="ml-3 text-slate-600 dark:text-slate-300 text-base md:text-lg">
              Loading...
            </span>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
