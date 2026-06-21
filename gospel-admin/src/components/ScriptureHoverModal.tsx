'use client'

import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from '@/contexts/TranslationContext'
import { Capacitor } from '@capacitor/core'
import { formatScriptureApiError } from '@/lib/format-scripture-api-error'

interface ScriptureHoverModalProps {
  reference: string
  children: React.ReactNode
  hoverDelayMs?: number // Optional hover delay in milliseconds, defaults to 500ms
  inline?: boolean // Render wrapper as <span> for inline text flow instead of <div>
}

interface ScriptureData {
  reference: string
  text: string
  translation?: string
}

/** Narrow / default width cap (~Tailwind `max-w-md`). */
const MODAL_WIDTH_CAP_DEFAULT_PX = 448
/** Tablet / small laptop hover — wider for chapter-style or long single-verse fetches. */
const MODAL_WIDTH_CAP_TABLET_PX = 520
/** Desktop — use most horizontal space while keeping margin from viewport edges. */
const MODAL_WIDTH_CAP_DESKTOP_PX = 600
const MODAL_WIDTH_BREAKPOINT_TABLET = 640
const MODAL_WIDTH_BREAKPOINT_DESKTOP = 900

/** Absolute height cap; CSS max-height is also limited by free space above/below the anchor. */
const MODAL_LAYOUT_HEIGHT_CAP_PX = 720
/**
 * Height assumption for "fits above / fits below" tests only. If this equals the full viewport
 * height, both tests fail and the popover clamps to the top (feels detached from the hover).
 */
const PLACEMENT_PROBE_HEIGHT_PX = 520
const MIN_POPOVER_MAX_HEIGHT_PX = 120
const VIEWPORT_PADDING_PX = 12
const ANCHOR_GAP_PX = 10
/** Above ScriptureModal (`z-50`) and word-study overlays; portaled to `body` to escape overflow clipping. */
const POPOVER_Z_CLASS = 'z-[60]'
const LONG_PRESS_BACKDROP_Z_CLASS = 'z-[55]'

function modalWidthCapPx(viewportWidth: number): number {
  if (viewportWidth >= MODAL_WIDTH_BREAKPOINT_DESKTOP) return MODAL_WIDTH_CAP_DESKTOP_PX
  if (viewportWidth >= MODAL_WIDTH_BREAKPOINT_TABLET) return MODAL_WIDTH_CAP_TABLET_PX
  return MODAL_WIDTH_CAP_DEFAULT_PX
}

function modalMaxHeightPx(viewportHeight: number, pad: number): number {
  const usable = viewportHeight - 2 * pad
  return Math.min(MODAL_LAYOUT_HEIGHT_CAP_PX, Math.max(1, usable))
}

/** Width/height for layout math — avoids `100vw` > `innerWidth` when a scrollbar is present. */
function layoutViewportSize(): { w: number; h: number } {
  if (typeof window === 'undefined') return { w: 1024, h: 768 }
  const vv = window.visualViewport
  const rawW = vv?.width ?? document.documentElement?.clientWidth ?? window.innerWidth
  const rawH = vv?.height ?? document.documentElement?.clientHeight ?? window.innerHeight
  const w = Math.round(rawW > 0 ? rawW : window.innerWidth)
  const h = Math.round(rawH > 0 ? rawH : window.innerHeight)
  return { w: Math.max(1, w), h: Math.max(1, h) }
}

type ScriptureFetchState = {
  translation: string
  reference: string
  data: ScriptureData | null
  error: string | null
  loading: boolean
}

export default function ScriptureHoverModal({ reference, children, hoverDelayMs = 500, inline = false }: ScriptureHoverModalProps) {
  const [visibleForReference, setVisibleForReference] = useState<string | null>(null)
  const [fetchState, setFetchState] = useState<ScriptureFetchState | null>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [popoverWidthPx, setPopoverWidthPx] = useState(MODAL_WIDTH_CAP_DEFAULT_PX)
  const [popoverMaxHeightPx, setPopoverMaxHeightPx] = useState(() =>
    modalMaxHeightPx(typeof window !== 'undefined' ? window.innerHeight : 768, VIEWPORT_PADDING_PX)
  )
  const [isAbove, setIsAbove] = useState(true)
  
  const { translation } = useTranslation()
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const longPressTriggeredRef = useRef(false)
  const containerRef = useRef<HTMLElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const anchorPointRef = useRef({ cx: 0, cy: 0 })
  const fetchStateRef = useRef<ScriptureFetchState | null>(null)
  const [openedByLongPressForReference, setOpenedByLongPressForReference] = useState<string | null>(null)

  useEffect(() => {
    fetchStateRef.current = fetchState
  }, [fetchState])

  const isVisible = visibleForReference === reference
  const openedByLongPress = openedByLongPressForReference === reference
  const matchesActiveFetch =
    fetchState?.reference === reference && fetchState?.translation === translation
  const scriptureData = matchesActiveFetch ? fetchState.data : null
  const loading = matchesActiveFetch ? fetchState.loading : false
  const error = matchesActiveFetch ? fetchState.error : null

  const fetchScriptureText = async (requestedRef: string) => {
    if (!requestedRef) return
    const cached = fetchStateRef.current
    if (
      cached?.reference === requestedRef &&
      cached.translation === translation &&
      cached.data
    ) {
      return
    }

    setFetchState({
      translation,
      reference: requestedRef,
      data: null,
      error: null,
      loading: true,
    })

    try {
      const response = await fetch(
        `/api/scripture?reference=${encodeURIComponent(requestedRef)}&translation=${translation}`,
        { cache: 'no-store' }
      )
      const data = await response.json()

      setFetchState((prev) => {
        if (prev?.reference !== requestedRef || prev.translation !== translation) return prev
        if (response.ok) {
          return { translation, reference: requestedRef, data, error: null, loading: false }
        }
        return {
          translation,
          reference: requestedRef,
          data: null,
          error: formatScriptureApiError(data) || 'Failed to fetch scripture text',
          loading: false,
        }
      })
    } catch {
      setFetchState((prev) => {
        if (prev?.reference !== requestedRef || prev.translation !== translation) return prev
        return {
          translation,
          reference: requestedRef,
          data: null,
          error: 'Network error while fetching scripture',
          loading: false,
        }
      })
    }
  }

  const setPositionFromPoint = useCallback((centerX: number, centerY: number) => {
    anchorPointRef.current = { cx: centerX, cy: centerY }

    const { w: sw, h: sh } = layoutViewportSize()
    const pad = VIEWPORT_PADDING_PX
    const inner = sw - 2 * pad
    const widthCap = modalWidthCapPx(sw)
    const modalWidth =
      inner <= 0 ? Math.min(widthCap, sw) : Math.min(widthCap, inner)
    const viewportMaxH = modalMaxHeightPx(sh, pad)
    /** Only for above/below fit checks — keeps the popover tied to the anchor. */
    const fitProbe = Math.min(PLACEMENT_PROBE_HEIGHT_PX, viewportMaxH)
    const gap = ANCHOR_GAP_PX

    const halfW = modalWidth / 2
    const x = Math.min(Math.max(centerX, pad + halfW), sw - pad - halfW)

    const aboveBottom = centerY - gap
    const aboveTop = aboveBottom - fitProbe
    const belowTop = centerY + gap
    const belowBottom = belowTop + fitProbe
    const spaceAbove = centerY - gap - pad
    const spaceBelow = sh - pad - centerY - gap

    let y: number
    let positionAbove: boolean
    let maxH: number

    if (aboveTop >= pad) {
      positionAbove = true
      maxH = Math.min(
        viewportMaxH,
        Math.max(MIN_POPOVER_MAX_HEIGHT_PX, centerY - gap - pad)
      )
      y = aboveBottom
      y = Math.min(y, sh - pad)
      y = Math.max(y, pad + maxH)
    } else if (belowBottom <= sh - pad) {
      positionAbove = false
      maxH = Math.min(
        viewportMaxH,
        Math.max(MIN_POPOVER_MAX_HEIGHT_PX, sh - pad - centerY - gap)
      )
      y = belowTop
      y = Math.max(pad, Math.min(y, sh - pad - maxH))
    } else if (spaceBelow >= spaceAbove) {
      // Tall probe does not fit either side, but one side still has usable space —
      // anchor there instead of "vertical center" with full maxH (which clamps y to ~pad).
      positionAbove = false
      maxH = Math.min(
        viewportMaxH,
        Math.max(MIN_POPOVER_MAX_HEIGHT_PX, spaceBelow)
      )
      y = belowTop
      y = Math.max(pad, Math.min(y, sh - pad - maxH))
    } else {
      positionAbove = true
      maxH = Math.min(
        viewportMaxH,
        Math.max(MIN_POPOVER_MAX_HEIGHT_PX, spaceAbove)
      )
      y = aboveBottom
      y = Math.min(y, sh - pad)
      y = Math.max(y, pad + maxH)
    }

    setPopoverWidthPx(modalWidth)
    setPopoverMaxHeightPx(maxH)
    setPosition({ x, y })
    setIsAbove(positionAbove)
  }, [])

  // Re-clamp after verse text/error loads so tall content stays inside the viewport cap.
  useLayoutEffect(() => {
    if (!isVisible) return
    const { cx, cy } = anchorPointRef.current
    setPositionFromPoint(cx, cy)
  }, [isVisible, scriptureData, error, loading, setPositionFromPoint])

  // Post-layout nudge: horizontal (width vs `innerWidth` mismatch) and vertical (tall popover vs anchor).
  useLayoutEffect(() => {
    if (!isVisible || !popoverRef.current) return
    const el = popoverRef.current
    const pad = VIEWPORT_PADDING_PX
    const { w: sw, h: sh } = layoutViewportSize()
    const r = el.getBoundingClientRect()
    // jsdom often reports 0×0 for un-laid-out fixed nodes; skip nudge to avoid bogus shifts.
    if (r.width < 2 || r.height < 2) return

    let dx = 0
    if (r.left < pad - 0.5) dx = pad - r.left
    else if (r.right > sw - pad + 0.5) dx = sw - pad - r.right

    let dy = 0
    if (r.top < pad - 0.5) dy = pad - r.top
    else if (r.bottom > sh - pad + 0.5) dy = sh - pad - r.bottom

    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return
    setPosition((p) => ({ ...p, x: p.x + dx, y: p.y + dy }))
  }, [isVisible, popoverWidthPx, popoverMaxHeightPx, scriptureData, error, loading, isAbove])

  const isTouchOnly =
    typeof window !== 'undefined' &&
    (Capacitor.isNativePlatform() || (typeof window.matchMedia === 'function' && window.matchMedia('(hover: none)').matches))

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (isTouchOnly) return

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    setPositionFromPoint(centerX, centerY)

    const refAtHover = reference
    hoverTimeoutRef.current = setTimeout(() => {
      setVisibleForReference(refAtHover)
      setOpenedByLongPressForReference(null)
      const cached = fetchStateRef.current
      const hasCachedForReference =
        cached?.reference === refAtHover &&
        cached.translation === translation &&
        cached.data != null
      const isLoadingForReference =
        cached?.reference === refAtHover &&
        cached.translation === translation &&
        cached.loading
      if (!hasCachedForReference && !isLoadingForReference) {
        void fetchScriptureText(refAtHover)
      }
    }, hoverDelayMs)
  }

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    setVisibleForReference(null)
    setOpenedByLongPressForReference(null)
  }

  const LONG_PRESS_MS = 500

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isTouchOnly) return
    const touch = e.changedTouches[0] ?? e.touches[0]
    if (!touch) return
    longPressTriggeredRef.current = false
    if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current)
    const clientX = touch.clientX
    const clientY = touch.clientY
    const refAtTouch = reference
    longPressTimeoutRef.current = setTimeout(() => {
      longPressTimeoutRef.current = null
      longPressTriggeredRef.current = true
      setPositionFromPoint(clientX, clientY)
      setVisibleForReference(refAtTouch)
      setOpenedByLongPressForReference(refAtTouch)
      const cached = fetchStateRef.current
      const hasCachedForReference =
        cached?.reference === refAtTouch &&
        cached.translation === translation &&
        cached.data != null
      const isLoadingForReference =
        cached?.reference === refAtTouch &&
        cached.translation === translation &&
        cached.loading
      if (!hasCachedForReference && !isLoadingForReference) {
        void fetchScriptureText(refAtTouch)
      }
    }, LONG_PRESS_MS)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
      longPressTimeoutRef.current = null
    }
    if (longPressTriggeredRef.current) {
      e.preventDefault()
      e.stopPropagation()
      longPressTriggeredRef.current = false
      // Close verse when finger lifts after long-press
      setVisibleForReference(null)
      setOpenedByLongPressForReference(null)
    }
  }

  const handleTouchCancel = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
      longPressTimeoutRef.current = null
    }
    longPressTriggeredRef.current = false
  }

  const closeLongPressPopup = () => {
    if (openedByLongPress) {
      setVisibleForReference(null)
      setOpenedByLongPressForReference(null)
    }
  }

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
      if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current)
    }
  }, [])

  // Prevent hover-opened popovers from getting "stuck" on screen.
  // If pointer-leave doesn't fire (e.g., scroll/blur/layout shift), force-close on common context changes.
  useEffect(() => {
    if (!isVisible || openedByLongPress) return

    const hide = () => {
      setVisibleForReference(null)
      setOpenedByLongPressForReference(null)
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (containerRef.current?.contains(target)) return
      hide()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') hide()
    }

    const handleVisibilityChange = () => {
      if (document.hidden) hide()
    }

    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    window.addEventListener('blur', hide)
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
      window.removeEventListener('blur', hide)
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isVisible, openedByLongPress])

  const wrapperEvents = {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchCancel,
  }

  const popoverLayer =
    isVisible && typeof document !== 'undefined' ? (
      <>
        {openedByLongPress && (
          <div
            className={`fixed inset-0 ${LONG_PRESS_BACKDROP_Z_CLASS}`}
            data-scripture-hover-backdrop
            aria-hidden
            onClick={closeLongPressPopup}
            onTouchEnd={(e) => {
              e.preventDefault()
              closeLongPressPopup()
            }}
          />
        )}
        <div
          ref={popoverRef}
          data-scripture-hover-popover
          className={`fixed ${POPOVER_Z_CLASS} box-border flex min-h-0 max-w-none flex-col overflow-hidden rounded-lg border border-slate-300 bg-white shadow-xl dark:border-slate-600 dark:bg-slate-800`}
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: `${popoverWidthPx}px`,
            maxHeight: `min(${popoverMaxHeightPx}px, min(90dvh, calc(100dvh - 24px)))`,
            transform: isAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0%)',
            pointerEvents: openedByLongPress ? 'auto' : 'none',
          }}
        >
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pt-4 pb-8 sm:px-6 sm:pt-6 sm:pb-10">
            {loading ? (
              <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                <div
                  className="h-6 w-6 shrink-0 animate-spin rounded-full border-b-2 border-blue-600 dark:border-blue-400"
                  aria-hidden
                />
                <span className="text-base md:text-lg">Loading verse...</span>
              </div>
            ) : error ? (
              <div className="text-base text-red-600 md:text-lg dark:text-red-400">
                <p className="font-medium">Error loading verse:</p>
                <p>{error}</p>
              </div>
            ) : scriptureData ? (
              <div className="text-slate-700 dark:text-slate-200">
                <div className="mb-2 text-base font-medium text-slate-900 md:text-lg dark:text-slate-100">
                  {scriptureData.reference}
                </div>
                <div className="wrap-break-word text-base leading-relaxed md:text-lg">{scriptureData.text}</div>
              </div>
            ) : (
              <div className="text-base text-slate-600 md:text-lg dark:text-slate-400">
                Hover for 1 second to load verse text
              </div>
            )}
          </div>

          {isAbove ? (
            <div
              className="pointer-events-none absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 border-t-4 border-r-4 border-l-4 border-transparent border-t-white dark:border-t-slate-800"
              style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.1))' }}
            />
          ) : (
            <div
              className="pointer-events-none absolute bottom-full left-1/2 h-0 w-0 -translate-x-1/2 border-b-4 border-r-4 border-l-4 border-transparent border-b-white dark:border-b-slate-800"
              style={{ filter: 'drop-shadow(0 -1px 1px rgba(0,0,0,0.1))' }}
            />
          )}
        </div>
      </>
    ) : null

  return (
    <>
      {inline ? (
        <span
          ref={(el) => {
            containerRef.current = el
          }}
          {...wrapperEvents}
          className="inline select-none"
        >
          {children}
        </span>
      ) : (
        <div
          ref={(el) => {
            containerRef.current = el
          }}
          {...wrapperEvents}
          className="relative select-none"
        >
          {children}
        </div>
      )}

      {popoverLayer ? createPortal(popoverLayer, document.body) : null}
    </>
  )
}