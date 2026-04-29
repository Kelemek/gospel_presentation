'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type DragEvent,
  type RefObject,
} from 'react'
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

/**
 * HTML5 drag-and-drop reordering (same pattern as admin scripture cards in ContentEditPageClient).
 * Chunks flow inline with tight margins; only segments still out of order get slightly wider spacing and padding.
 * iOS Safari support for native drag is uneven; mouse/desktop-first matches the admin editor.
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
  const [draggedSlot, setDraggedSlot] = useState<number | null>(null)
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null)

  const firstWrongSlotIndex = useMemo(() => {
    const len = slotChunkIds.length
    for (let i = 0; i < len; i++) {
      if (slotChunkIds[i] !== i) return i
    }
    return null
  }, [slotChunkIds])

  useEffect(() => {
    if (draggedSlot === null) return
    const el = scrollParentRef?.current
    if (!el) return
    const EDGE_PX = 56
    const STEP_PX = 16
    const onDocumentDragOver = (ev: globalThis.DragEvent) => {
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
  }, [draggedSlot, scrollParentRef])

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

  const handleDragStart = useCallback((e: DragEvent, slotIndex: number) => {
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
  }, [slotChunkIds])

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
    <div
      className={`rounded-md transition-shadow ${listFlashError ? 'ring-2 ring-red-400 dark:ring-red-500 p-1' : ''}`}
    >
      <ul
        role="list"
        data-testid="memorize-reorder-list"
        className={`list-none m-0 p-0 flex flex-wrap items-baseline gap-x-0 gap-y-2 sm:gap-y-1 text-base leading-relaxed font-serif ${className}`}
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

        return (
          <li
            key={`reorder-slot-${slotIndex}-${chunkId}`}
            draggable={draggable}
            onDragStart={(e) => handleDragStart(e, slotIndex)}
            onDragOver={(e) => handleDragOver(e, slotIndex)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, slotIndex)}
            onDragEnd={handleDragEnd}
            className={`min-w-0 max-w-full rounded-md text-slate-900 dark:text-slate-100 transition-shadow wrap-anywhere hyphens-auto ${spacingAfter} ${pad} ${rowRing} ${
              isDragging ? 'opacity-60' : ''
            } ${draggable ? 'cursor-move touch-manipulation' : 'cursor-default'}`}
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
                  ? 'text-blue-800 dark:text-blue-200 italic'
                  : ''
              }
            >
              {displayText}
            </span>
          </li>
        )
      })}
      </ul>
    </div>
  )
}
