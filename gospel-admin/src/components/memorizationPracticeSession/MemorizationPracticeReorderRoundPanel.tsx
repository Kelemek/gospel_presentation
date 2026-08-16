'use client'

import { MemorizationReorderPanel } from '@/components/MemorizationReorderPanel'
import type { MemorizationReorderChunk } from '@/lib/memorizationPracticeUtils'
import type { RefObject } from 'react'

export type MemorizationPracticeReorderRoundPanelProps = {
  reorderChunks: MemorizationReorderChunk[]
  reorderSlotChunkIds: number[]
  setReorderSlotChunkIds: (ids: number[] | ((prev: number[]) => number[])) => void
  reorderRoundMovableIndices: Set<number>
  onInvalidDrop: () => void
  onWrongSwap: () => void
  onSlotsBecameCorrect: (slots: number[]) => void
  flashError: boolean
  hintActive: boolean
  practiceScrollRef: RefObject<HTMLDivElement | null>
  reorderColonAfterSlotIndex: number | null
  extraFixedSlotSpacing: boolean
}

export function MemorizationPracticeReorderRoundPanel({
  reorderChunks,
  reorderSlotChunkIds,
  setReorderSlotChunkIds,
  reorderRoundMovableIndices,
  onInvalidDrop,
  onWrongSwap,
  onSlotsBecameCorrect,
  flashError,
  hintActive,
  practiceScrollRef,
  reorderColonAfterSlotIndex,
  extraFixedSlotSpacing,
}: MemorizationPracticeReorderRoundPanelProps) {
  return (
  <>
    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
      Drag the <strong>highlighted</strong> parts into reading order. Drop a part onto another highlighted
      part—fixed parts stay put. Hold <strong>Hint</strong> to peek at what belongs in the first slot that is
      still wrong.
    </p>
    <MemorizationReorderPanel
      chunks={reorderChunks}
      slotChunkIds={reorderSlotChunkIds}
      onSlotChunkIdsChange={setReorderSlotChunkIds}
      roundMovableIndices={reorderRoundMovableIndices}
      onInvalidDrop={onInvalidDrop}
      onWrongSwap={onWrongSwap}
      onSlotsBecameCorrect={onSlotsBecameCorrect}
      listFlashError={flashError}
      holdHintPeekFirstWrong={hintActive}
      scrollParentRef={practiceScrollRef}
      colonAfterSlotIndex={reorderColonAfterSlotIndex}
      extraFixedSlotSpacing={extraFixedSlotSpacing}
    />
  </>
  )
}
