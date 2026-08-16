'use client'

import type { RefObject } from 'react'
import type { MemorizationToken } from '@/lib/memorizationPracticeUtils'
import { MemorizationPracticeVerseTokenSpan } from '@/components/memorizationPracticeSession/MemorizationPracticeVerseTokenSpan'

export type MemorizationPracticeWordRoundPanelProps = {
  tokens: MemorizationToken[]
  hiddenIndices: Set<number>
  revealed: Set<number>
  hintActive: boolean
  hintPeekIndices: Set<number>
  currentTargetIndex: number | null
  currentTargetToken: MemorizationToken | null
  flashError: boolean
  practiceWordsWordRef: RefObject<HTMLDivElement | null>
}

export function MemorizationPracticeWordRoundPanel({
  tokens,
  hiddenIndices,
  revealed,
  hintActive,
  hintPeekIndices,
  currentTargetIndex,
  currentTargetToken,
  flashError,
  practiceWordsWordRef,
}: MemorizationPracticeWordRoundPanelProps) {
  return (
    <>
      {currentTargetIndex !== null && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          {currentTargetToken?.kind === 'digit'
            ? 'Tap the digit in the choice bar at the bottom that fills the next blank (left to right).'
            : 'Tap the word in the bottom choice bar that fills the next blank (left to right). Hold Hint to peek; another blank appears every second while you hold.'}
        </p>
      )}
      <div
      ref={practiceWordsWordRef}
      role="group"
      aria-label="Verse practice area"
      className={`touch-manipulation text-base leading-relaxed font-serif flex flex-wrap gap-x-2 gap-y-2.5 sm:gap-x-1 sm:gap-y-2 items-baseline rounded-md p-1 ring-2 ring-inset transition-shadow ${
        flashError ? 'ring-red-400 dark:ring-red-500' : 'ring-transparent'
      }`}
      data-testid="memorize-practice-words"
    >
      {tokens.map((token, i) => (
        <MemorizationPracticeVerseTokenSpan
          key={`tok-${i}`}
          token={token}
          index={i}
          hiddenIndices={hiddenIndices}
          revealed={revealed}
          hintActive={hintActive}
          hintPeekIndices={hintPeekIndices}
          currentTargetIndex={currentTargetIndex}
        />
      ))}
      </div>
    </>
  )
}
