'use client'

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import {
  PASSAGE_SWIPE_ANIMATION_MS,
  PASSAGE_SWIPE_EASING,
  usePassageSwipeNav,
} from '@/hooks/usePassageSwipeNav'
import { useLongPress } from '@/hooks/useLongPress'

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
  /** Long-press anywhere in this pane (capture phase, same hit area as swipe). */
  onLongPress?: () => void
}

const transformStyle = (
  offsetX: number,
  transitionEnabled: boolean
): CSSProperties => ({
  transform: `translateX(${offsetX}px)`,
  transition: transitionEnabled
    ? `transform ${PASSAGE_SWIPE_ANIMATION_MS}ms ${PASSAGE_SWIPE_EASING}`
    : 'none',
})

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
  onLongPress,
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
    currentOffsetX,
    underlayOffsetX,
    underlaySide,
    phase,
    transitionEnabled,
    isSwipeActive,
    canDragNavigate,
    pointerHandlers,
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
  const showUnderlay =
    underlaySide !== null && underlayOffsetX !== null && (phase !== 'idle' || isSwipeActive)

  const noTextSelectClass = 'select-none [&_*]:select-none'

  const shellClassName = [
    'overflow-hidden',
    noTextSelectClass,
    canDragNavigate && phase !== 'dragging' ? 'cursor-grab' : '',
    phase === 'dragging' ? 'cursor-grabbing' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  const { onPointerDown } = pointerHandlers

  const { onPointerDownCapture: onLongPressPointerDownCapture, onTouchStartCapture } =
    useLongPress({
      onLongPress: onLongPress ?? (() => {}),
      disabled: !onLongPress,
    })

  const handlePointerDownCapture = useCallback(
    (e: ReactPointerEvent) => {
      onPointerDown(e)
      if (onLongPress) onLongPressPointerDownCapture(e)
    },
    [onPointerDown, onLongPress, onLongPressPointerDownCapture]
  )

  return (
    <div
      ref={shellRef}
      className={shellClassName}
      data-tour="scripture-modal-passage-swipe"
      onPointerDownCapture={handlePointerDownCapture}
      {...(onLongPress ? { onTouchStartCapture } : {})}
    >
      <div className="relative w-full min-h-0 flex-1 flex flex-col">
        {showUnderlay ? (
          <div
            className="absolute inset-0 z-0 will-change-transform"
            style={transformStyle(underlayOffsetX, transitionEnabled)}
            aria-hidden
          >
            <div className="h-full min-h-[120px] bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-600 rounded-lg">
              {showPlaceholder ? (
                <div className="flex items-center justify-center py-12 h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                  <span className="ml-3 text-slate-600 dark:text-slate-300 text-base md:text-lg">
                    Loading...
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div
          className="relative z-10 min-h-0 flex-1 flex flex-col will-change-transform"
          style={transformStyle(currentOffsetX, transitionEnabled)}
          onTransitionEnd={handleTransitionEnd}
          data-phase={phase}
          data-underlay={underlaySide ?? 'none'}
        >
          {showPlaceholder && !showUnderlay ? (
            <div className="flex items-center justify-center py-12 min-h-[120px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <span className="ml-3 text-slate-600 dark:text-slate-300 text-base md:text-lg">
                Loading...
              </span>
            </div>
          ) : (
            <div
              key={contentKey}
              className={`${noTextSelectClass} min-h-0 flex-1 flex flex-col`}
            >
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
