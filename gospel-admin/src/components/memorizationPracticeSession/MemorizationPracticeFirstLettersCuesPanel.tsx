'use client'

import { cueGlyphForTypableToken } from '@/lib/memorizationPracticeUtils'
import type { MemorizationToken } from '@/lib/memorizationPracticeUtils'
import type { RefObject } from 'react'

export type MemorizationPracticeFirstLettersCuesPanelProps = {
  tokens: MemorizationToken[]
  typableIndices: number[]
  firstLetterCueHiddenSlots: Set<number>
  firstLetterCueRevealedSlots: Set<number>
  currentTargetIndex: number | null
  currentTargetToken: MemorizationToken | null
  firstLetterCuesViewportRef: RefObject<HTMLDivElement | null>
}

export function MemorizationPracticeFirstLettersCuesPanel({
  tokens,
  typableIndices,
  firstLetterCueHiddenSlots,
  firstLetterCueRevealedSlots,
  currentTargetIndex,
  currentTargetToken,
  firstLetterCuesViewportRef,
}: MemorizationPracticeFirstLettersCuesPanelProps) {
  return (
    <>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
        Cues below line up with blanks in order (first letter of each word or each reference digit); dots
        hide cues until you type the right key.{' '}
        {currentTargetIndex !== null &&
          (currentTargetToken?.kind === 'digit'
            ? 'Type digits only; colons and dashes are not typed.'
            : 'Type first letters. Hold Hint to peek (one more blank each second).')}
        {currentTargetIndex !== null && ' '}
        Tap the verse if the keyboard closes.
      </p>
      <div
        ref={firstLetterCuesViewportRef}
        className="min-h-0 max-h-[calc(3*1.625*1em)] overflow-y-auto overflow-x-hidden overscroll-y-contain touch-pan-y rounded-sm px-2 font-mono text-base sm:text-lg font-bold leading-relaxed tracking-wide text-slate-900 dark:text-slate-100 [-webkit-overflow-scrolling:touch]"
        aria-label="Initials cues (three lines visible; scrolls with the active blank)"
      >
        <p
          className="mb-0 break-all sm:wrap-break-word"
          aria-label="Initials row: one hint character per blank in order; a dot hides a hint until you type that blank's first letter or digit correctly"
          data-testid="memorize-first-letter-cues"
        >
          {typableIndices.map((tokenIndex, slot) => {
            const t = tokens[tokenIndex]
            if (!t) return null
            const hiddenSlot =
              firstLetterCueHiddenSlots.has(slot) && !firstLetterCueRevealedSlots.has(slot)
            const glyph = cueGlyphForTypableToken(t)
            const isActiveCue = currentTargetIndex !== null && tokenIndex === currentTargetIndex
            return (
              <span key={`cue-${tokenIndex}-${slot}`} data-memorize-cue-slot={slot}>
                {slot > 0 ? ' ' : ''}
                <span
                  className={
                    isActiveCue
                      ? 'rounded px-0.5 ring-2 ring-blue-400/90 bg-blue-100 text-blue-950 dark:bg-blue-900/55 dark:text-blue-50 dark:ring-blue-500/80'
                      : undefined
                  }
                >
                  {hiddenSlot ? '·' : glyph}
                </span>
              </span>
            )
          })}
        </p>
      </div>
    </>
  )
}
