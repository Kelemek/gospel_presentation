'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import type { MemorizationReorderChunk } from '@/lib/memorizationPracticeUtils'

export interface MemorizationReorderPanelProps {
  chunks: MemorizationReorderChunk[]
  /** slotChunkIds[slot] = id of chunk text shown at that slot */
  slotChunkIds: number[]
  onSlotChunkIdsChange: (next: number[]) => void
  /** Slots that were shuffled this round; others stay fixed at identity. */
  roundMovableIndices: ReadonlySet<number>
  onInvalidDrop: () => void
  /** Notifies parent so it can increment metrics when a slot first becomes correct. */
  onSlotsBecameCorrect?: (slots: number[]) => void
  /** Parent-driven red flash (e.g. shared with word-mode timing). */
  listFlashError?: boolean
  /** While true (user holding Hint), the first still-wrong slot shows the correct phrase until release. */
  holdHintPeekFirstWrong?: boolean
  /**
   * Practice column scroller: while dragging, pointer near top/bottom edges scrolls so off-screen
   * drop targets can be reached. Also used implicitly via scrollIntoView on drag start.
   */
  scrollParentRef?: RefObject<HTMLElement | null>
  className?: string
}

/** Prefer pointer-driven reorder so WebKit does not require a long-press before HTML5 drag (Capacitor / phones). */
function useMemorizeReorderPointerPath(): boolean {
  const [v, setV] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(hover: none), (any-pointer: coarse)')
    const apply = (): void => {
      const touchCapable =
        mq.matches ||
        (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)
      setV(touchCapable)
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])
  return v
}

/** Touch / pen: short hold before drag starts (lets the browser settle; scroll is not started on movable chips — see `touch-none`). */
const POINTER_REORDER_TOUCH_DELAY_MS = 110
/** Mouse (or mouse on hybrid): start drag after a small move so clicks do not drag. */
const POINTER_REORDER_MOUSE_MOVE_THRESHOLD_PX = 5

function slotIndexUnderPointer(listRoot: HTMLElement, clientX: number, clientY: number): number | null {
  const stack = document.elementsFromPoint(clientX, clientY)
  for (const node of stack) {
    if (!(node instanceof Element)) continue
    const li = node.closest('li[data-reorder-slot]')
    if (!li || !listRoot.contains(li)) continue
    const raw = li.getAttribute('data-reorder-slot')
    if (raw == null) continue
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  }
  return null
}

/**
 * HTML5 drag-and-drop on fine-pointer desktop; pointer-based reorder on touch / coarse primary
 * (avoids WebKit’s long-press gate before `draggable` moves on Capacitor / iOS).
 */
export function MemorizationReorderPanel({
  chunks,
  slotChunkIds,
  onSlotChunkIdsChange,
  roundMovableIndices,
  onInvalidDrop,
  onSlotsBecameCorrect,
  listFlashError = false,
  holdHintPeekFirstWrong = false,
  scrollParentRef,
  className = '',
}: MemorizationReorderPanelProps) {
  const usePointerPath = useMemorizeReorderPointerPath()
  const [draggedSlot, setDraggedSlot] = useState<number | null>(null)
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null)
  /** Finger/client position for the floating chip while pointer-dragging (touch / coarse path only). */
  const [pointerDragPreview, setPointerDragPreview] = useState<{ x: number; y: number } | null>(
    null
  )

  const listRef = useRef<HTMLUListElement>(null)
  const slotChunkIdsRef = useRef(slotChunkIds)
  slotChunkIdsRef.current = slotChunkIds
  const draggedSlotRef = useRef<number | null>(null)
  draggedSlotRef.current = draggedSlot
  const dragOverSlotRef = useRef<number | null>(null)
  dragOverSlotRef.current = dragOverSlot

  type PendingSession = {
    pointerId: number
    slotIndex: number
    startX: number
    startY: number
    touchLike: boolean
    /** `window.setTimeout` id in the browser (differs from Node `Timeout` typing). */
    timer: number | null
  }
  const pendingRef = useRef<PendingSession | null>(null)
  const activeDragPointerIdRef = useRef<number | null>(null)

  const applySwap = useCallback(
    (src: number, dst: number, current: number[]) => {
      if (src === dst) return
      const prev = current
      if (prev[dst] === dst) {
        onInvalidDrop()
        return
      }
      const next = [...prev]
      ;[next[src], next[dst]] = [next[dst]!, next[src]!]
      const became: number[] = []
      for (let i = 0; i < next.length; i++) {
        if (next[i] === i && prev[i] !== i) became.push(i)
      }
      onSlotChunkIdsChange(next)
      if (became.length > 0) onSlotsBecameCorrect?.(became)
    },
    [onInvalidDrop, onSlotChunkIdsChange, onSlotsBecameCorrect]
  )

  const firstWrongSlotIndex = useMemo(() => {
    const len = slotChunkIds.length
    for (let i = 0; i < len; i++) {
      if (slotChunkIds[i] !== i) return i
    }
    return null
  }, [slotChunkIds])

  const clearPending = useCallback(() => {
    const p = pendingRef.current
    if (p?.timer != null) window.clearTimeout(p.timer)
    pendingRef.current = null
  }, [])

  const pointerDragLabel = useMemo(() => {
    if (draggedSlot === null) return ''
    const slotIndex = draggedSlot
    const chunkId = slotChunkIds[slotIndex] ?? slotIndex
    const chunk = chunks[chunkId]
    const text = chunk?.text ?? ''
    const showHoldPeek =
      holdHintPeekFirstWrong &&
      firstWrongSlotIndex === slotIndex &&
      slotChunkIds[slotIndex] !== slotIndex
    const peekText = chunks[slotIndex]?.text ?? ''
    return showHoldPeek ? peekText : text
  }, [
    draggedSlot,
    slotChunkIds,
    chunks,
    holdHintPeekFirstWrong,
    firstWrongSlotIndex,
  ])

  const endPointerDragGesture = useCallback(() => {
    activeDragPointerIdRef.current = null
    draggedSlotRef.current = null
    dragOverSlotRef.current = null
    setPointerDragPreview(null)
    setDraggedSlot(null)
    setDragOverSlot(null)
  }, [])

  const beginPointerDrag = useCallback(
    (slotIndex: number, pointerId: number) => {
      clearPending()
      const root = listRef.current
      if (!root) return
      const li = root.querySelector(`li[data-reorder-slot="${slotIndex}"]`)
      if (!(li instanceof HTMLElement)) return
      try {
        li.setPointerCapture(pointerId)
      } catch {
        /* capture unsupported */
      }
      activeDragPointerIdRef.current = pointerId
      draggedSlotRef.current = slotIndex
      if (typeof window !== 'undefined' && typeof window.getSelection === 'function') {
        window.getSelection()?.removeAllRanges()
      }
      setDraggedSlot(slotIndex)
      const r = li.getBoundingClientRect()
      setPointerDragPreview({
        x: r.left + r.width / 2,
        y: r.top + r.height / 2,
      })
      requestAnimationFrame(() => {
        li.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' })
      })
    },
    [clearPending]
  )

  const commitPointerDrop = useCallback(
    (clientX: number, clientY: number) => {
      const src = draggedSlotRef.current
      const root = listRef.current
      if (src === null || !root) {
        endPointerDragGesture()
        return
      }
      const releaseCapture = (): void => {
        const li = root.querySelector(`li[data-reorder-slot="${src}"]`)
        const pid = activeDragPointerIdRef.current
        if (li instanceof HTMLElement && pid != null) {
          try {
            if (li.hasPointerCapture(pid)) li.releasePointerCapture(pid)
          } catch {
            /* ignore */
          }
        }
      }
      releaseCapture()

      const dst =
        dragOverSlotRef.current ?? slotIndexUnderPointer(root, clientX, clientY) ?? src
      activeDragPointerIdRef.current = null
      draggedSlotRef.current = null
      dragOverSlotRef.current = null
      setPointerDragPreview(null)
      setDraggedSlot(null)
      setDragOverSlot(null)

      const current = slotChunkIdsRef.current
      if (src === dst) return
      if (current[dst] === dst) {
        onInvalidDrop()
        return
      }
      applySwap(src, dst, current)
    },
    [applySwap, endPointerDragGesture, onInvalidDrop]
  )

  const purgePointerListenersRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    return () => {
      purgePointerListenersRef.current?.()
      purgePointerListenersRef.current = null
      clearPending()
    }
  }, [clearPending])

  const attachDocumentPointerTracking = useCallback(() => {
    purgePointerListenersRef.current?.()
    const scrollEl = scrollParentRef?.current
    const EDGE_PX = 56
    const STEP_PX = 16

    const onMove = (ev: PointerEvent): void => {
      const pending = pendingRef.current
      if (pending && ev.pointerId === pending.pointerId && draggedSlotRef.current === null) {
        const dx = ev.clientX - pending.startX
        const dy = ev.clientY - pending.startY
        const dist = Math.hypot(dx, dy)
        if (!pending.touchLike && dist > POINTER_REORDER_MOUSE_MOVE_THRESHOLD_PX) {
          const slot = pending.slotIndex
          const pid = pending.pointerId
          if (pending.timer != null) window.clearTimeout(pending.timer)
          pendingRef.current = null
          beginPointerDrag(slot, pid)
        }
        return
      }

      if (ev.pointerId !== activeDragPointerIdRef.current) return
      ev.preventDefault()
      setPointerDragPreview({ x: ev.clientX, y: ev.clientY })
      const root = listRef.current
      if (root) {
        const over = slotIndexUnderPointer(root, ev.clientX, ev.clientY)
        if (over != null) {
          dragOverSlotRef.current = over
          setDragOverSlot(over)
        }
      }
      if (scrollEl) {
        const r = scrollEl.getBoundingClientRect()
        if (ev.clientY < r.top + EDGE_PX) {
          scrollEl.scrollTop = Math.max(0, scrollEl.scrollTop - STEP_PX)
        } else if (ev.clientY > r.bottom - EDGE_PX) {
          const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight
          scrollEl.scrollTop = Math.min(maxScroll, scrollEl.scrollTop + STEP_PX)
        }
      }
    }

    const onUpOrCancel = (ev: PointerEvent): void => {
      if (pendingRef.current && ev.pointerId === pendingRef.current.pointerId) {
        purgePointerListenersRef.current?.()
        purgePointerListenersRef.current = null
        clearPending()
        return
      }
      if (ev.pointerId !== activeDragPointerIdRef.current) return
      purgePointerListenersRef.current?.()
      purgePointerListenersRef.current = null
      commitPointerDrop(ev.clientX, ev.clientY)
    }

    document.addEventListener('pointermove', onMove, { capture: true, passive: false })
    document.addEventListener('pointerup', onUpOrCancel, { capture: true })
    document.addEventListener('pointercancel', onUpOrCancel, { capture: true })
    const teardown = (): void => {
      document.removeEventListener('pointermove', onMove, { capture: true })
      document.removeEventListener('pointerup', onUpOrCancel, { capture: true })
      document.removeEventListener('pointercancel', onUpOrCancel, { capture: true })
    }
    purgePointerListenersRef.current = teardown
  }, [
    beginPointerDrag,
    clearPending,
    commitPointerDrop,
    scrollParentRef,
  ])

  const handleListPointerDown = useCallback(
    (e: React.PointerEvent<HTMLUListElement>) => {
      if (!usePointerPath) return
      const root = listRef.current
      if (!root) return
      const li = (e.target as Element | null)?.closest?.('li[data-reorder-slot]')
      if (!li || !root.contains(li)) return
      const raw = li.getAttribute('data-reorder-slot')
      if (raw == null) return
      const slotIndex = Number(raw)
      if (!Number.isFinite(slotIndex)) return

      const wasInRoundShuffle = roundMovableIndices.has(slotIndex)
      const lockedByRound = !wasInRoundShuffle
      const isSolved = slotChunkIds[slotIndex] === slotIndex
      const canDrag = !lockedByRound && !isSolved
      if (!canDrag) return

      if (typeof window !== 'undefined' && typeof window.getSelection === 'function') {
        window.getSelection()?.removeAllRanges()
      }

      const touchLike = e.pointerType === 'touch' || e.pointerType === 'pen'
      clearPending()
      pendingRef.current = {
        pointerId: e.pointerId,
        slotIndex,
        startX: e.clientX,
        startY: e.clientY,
        touchLike,
        timer: touchLike
          ? window.setTimeout(() => {
              const pend = pendingRef.current
              if (!pend) return
              beginPointerDrag(pend.slotIndex, pend.pointerId)
            }, POINTER_REORDER_TOUCH_DELAY_MS)
          : null,
      }
      attachDocumentPointerTracking()
    },
    [
      attachDocumentPointerTracking,
      beginPointerDrag,
      clearPending,
      roundMovableIndices,
      slotChunkIds,
      usePointerPath,
    ]
  )

  useEffect(() => {
    if (usePointerPath) return
    if (draggedSlot === null) return
    const el = scrollParentRef?.current
    if (!el) return
    const EDGE_PX = 56
    const STEP_PX = 16
    const onDocumentDragOver = (ev: globalThis.DragEvent): void => {
      ev.preventDefault()
      if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move'
      const r = el.getBoundingClientRect()
      if (ev.clientY < r.top + EDGE_PX) {
        el.scrollTop = Math.max(0, el.scrollTop - STEP_PX)
      } else if (ev.clientY > r.bottom - EDGE_PX) {
        const maxScroll = el.scrollHeight - el.clientHeight
        el.scrollTop = Math.min(maxScroll, el.scrollTop + STEP_PX)
      }
    }
    document.addEventListener('dragover', onDocumentDragOver)
    return () => document.removeEventListener('dragover', onDocumentDragOver)
  }, [draggedSlot, scrollParentRef, usePointerPath])

  const handleDragStart = useCallback(
    (e: DragEvent, slotIndex: number) => {
      if (slotChunkIds[slotIndex] === slotIndex) {
        e.preventDefault()
        return
      }
      setDraggedSlot(slotIndex)
      e.dataTransfer.effectAllowed = 'move'
      try {
        e.dataTransfer.setData('text/plain', String(slotIndex))
      } catch {
        /* ignore */
      }
      const target = e.currentTarget as HTMLElement
      requestAnimationFrame(() => {
        target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' })
      })
    },
    [slotChunkIds]
  )

  const handleDragOver = useCallback((e: DragEvent, slotIndex: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverSlot(slotIndex)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverSlot(null)
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent, dst: number) => {
      e.preventDefault()
      const src = draggedSlot
      setDraggedSlot(null)
      setDragOverSlot(null)
      if (src === null) return
      if (src === dst) return
      if (slotChunkIds[dst] === dst) {
        onInvalidDrop()
        return
      }
      applySwap(src, dst, slotChunkIds)
    },
    [draggedSlot, applySwap, onInvalidDrop, slotChunkIds]
  )

  const handleDragEnd = useCallback(() => {
    setDraggedSlot(null)
    setDragOverSlot(null)
  }, [])

  const n = chunks.length

  return (
    <>
    <div
      className={`rounded-md transition-shadow ${listFlashError ? 'ring-2 ring-red-400 dark:ring-red-500 p-1' : ''}`}
    >
      <ul
        ref={listRef}
        role="list"
        data-testid="memorize-reorder-list"
        className={`list-none m-0 p-0 flex flex-wrap items-baseline gap-x-0 gap-y-2 sm:gap-y-1 text-base leading-relaxed font-serif ${className}`}
        onPointerDown={handleListPointerDown}
      >
        {Array.from({ length: n }, (_, slotIndex) => {
          const chunkId = slotChunkIds[slotIndex] ?? slotIndex
          const chunk = chunks[chunkId]
          const text = chunk?.text ?? ''
          const showHoldPeek =
            holdHintPeekFirstWrong &&
            firstWrongSlotIndex === slotIndex &&
            slotChunkIds[slotIndex] !== slotIndex
          const peekText = chunks[slotIndex]?.text ?? ''
          const displayText = showHoldPeek ? peekText : text
          const isSolved = slotChunkIds[slotIndex] === slotIndex
          const wasInRoundShuffle = roundMovableIndices.has(slotIndex)
          const lockedByRound = !wasInRoundShuffle
          const draggable = !lockedByRound ? !isSolved : false
          const needsAttention = wasInRoundShuffle && !isSolved
          const isDragging = draggedSlot === slotIndex
          const isDragOver = dragOverSlot === slotIndex
          const rowRing = isDragOver
            ? 'ring-2 ring-blue-400 dark:ring-blue-500'
            : needsAttention
              ? 'ring-2 ring-amber-300 dark:ring-amber-600/80 bg-amber-50/90 dark:bg-amber-950/35'
              : 'ring-2 ring-transparent'
          /** Room for fingers on small screens; tighter on sm+ (desktop mouse). */
          const spacingAfter = needsAttention
            ? 'mr-2 last:mr-0 sm:mr-1'
            : 'mr-1.5 last:mr-0 sm:mr-0.5'
          const pad =
            needsAttention || isDragOver
              ? 'px-2.5 py-1 sm:px-2 sm:py-0.5'
              : 'px-0 py-0'

          const nativeDraggable = draggable && !usePointerPath

          return (
            <li
              key={`reorder-slot-${slotIndex}-${chunkId}`}
              data-reorder-slot={slotIndex}
              draggable={nativeDraggable}
              onDragStart={(e) => handleDragStart(e, slotIndex)}
              onDragOver={(e) => handleDragOver(e, slotIndex)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, slotIndex)}
              onDragEnd={handleDragEnd}
              className={`min-w-0 max-w-full rounded-md text-slate-900 dark:text-slate-100 transition-shadow wrap-anywhere hyphens-auto select-none [-webkit-touch-callout:none] ${spacingAfter} ${pad} ${rowRing} ${
                isDragging
                  ? usePointerPath
                    ? 'opacity-35'
                    : 'opacity-60'
                  : ''
              } ${
                draggable
                  ? usePointerPath
                    ? 'cursor-move touch-none'
                    : 'cursor-move touch-manipulation'
                  : 'cursor-default touch-manipulation'
              }`}
              aria-label={
                lockedByRound
                  ? `Verse part ${slotIndex + 1} (fixed)`
                  : isSolved
                    ? `Verse part ${slotIndex + 1} (in correct order)`
                    : `Verse part ${slotIndex + 1}; drag to reorder`
              }
            >
              <span
                className={
                  showHoldPeek
                    ? 'pointer-events-none text-blue-800 dark:text-blue-200 italic'
                    : 'pointer-events-none'
                }
              >
                {displayText}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
    {usePointerPath &&
    draggedSlot !== null &&
    pointerDragPreview != null &&
    pointerDragLabel !== '' &&
    typeof document !== 'undefined'
      ? createPortal(
          <div
            aria-hidden
            data-testid="memorize-reorder-drag-preview"
            className="fixed z-200 max-w-[min(90vw,28rem)] rounded-md px-2.5 py-1 text-base leading-relaxed font-serif wrap-anywhere hyphens-auto pointer-events-none select-none shadow-xl border-2 border-amber-300 dark:border-amber-600/80 bg-amber-50/95 dark:bg-amber-950/90 text-slate-900 dark:text-slate-100"
            style={{
              left: pointerDragPreview.x,
              top: pointerDragPreview.y,
              transform: 'translate(-50%, calc(-100% - 10px))',
            }}
          >
            {pointerDragLabel}
          </div>,
          document.body
        )
      : null}
    </>
  )
}
