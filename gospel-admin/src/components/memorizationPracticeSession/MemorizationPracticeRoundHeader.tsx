'use client'

import {
  MEMORIZATION_FULL_HIDE_ROUND,
  hiddenFractionForRound,
  reorderMovableCountForRound,
} from '@/lib/memorizationPracticeUtils'
import type { MemorizationPracticeMode } from '@/lib/verseMemorizationStorage'

export type MemorizationPracticeRoundHeaderProps = {
  practiceMode: MemorizationPracticeMode | null
  roundIndex: number
  roundCompleteInstruction: string | null
  reorderChunkCount: number
  firstLetterCueHiddenCount: number
  typableCount: number
  wrongAttemptsInRound: number
  showStrictErrorsBadge: boolean
}

export function MemorizationPracticeRoundHeader({
  practiceMode,
  roundIndex,
  roundCompleteInstruction,
  reorderChunkCount,
  firstLetterCueHiddenCount,
  typableCount,
  wrongAttemptsInRound,
  showStrictErrorsBadge,
}: MemorizationPracticeRoundHeaderProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {roundCompleteInstruction ??
          (practiceMode === 'reorder' ? (
            <>
              Round {roundIndex} of {MEMORIZATION_FULL_HIDE_ROUND} — reorder about{' '}
              {reorderMovableCountForRound(roundIndex, reorderChunkCount)} of {reorderChunkCount}{' '}
              parts.
            </>
          ) : practiceMode === 'firstLetters' ? (
            <>
              Round {roundIndex} of {MEMORIZATION_FULL_HIDE_ROUND} — initials:{' '}
              {firstLetterCueHiddenCount} of {typableCount} hidden.
            </>
          ) : (
            <>
              Round {roundIndex} of {MEMORIZATION_FULL_HIDE_ROUND} — about{' '}
              {Math.round(hiddenFractionForRound(roundIndex) * 100)}% hidden
            </>
          ))}
      </p>
      {showStrictErrorsBadge && (
        <p
          className="text-sm font-medium text-red-700 dark:text-red-300"
          data-testid="memorize-errors-count"
        >
          Errors: {wrongAttemptsInRound}
        </p>
      )}
    </div>
  )
}
