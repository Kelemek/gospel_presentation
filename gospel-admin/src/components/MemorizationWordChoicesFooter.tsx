'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  MEMORIZATION_WORD_CHOICE_COMFORTABLE_MEDIA_QUERY,
  MEMORIZATION_WORD_CHOICE_ROW_COUNT_COMPACT,
  memorizationWordChoiceRowCount,
  memorizationWordChoicesPanelMinHeight,
  splitMemorizationChoiceRows,
  type MemorizationToken,
} from '@/lib/memorizationPracticeUtils'

export interface MemorizationWordChoicesFooterProps {
  labels: readonly string[]
  targetKind: MemorizationToken['kind'] | null
  onGuess: (label: string) => void
}

function useMemorizationWordChoiceRowCount(): number {
  const [rowCount, setRowCount] = useState(MEMORIZATION_WORD_CHOICE_ROW_COUNT_COMPACT)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }
    const mediaQuery = window.matchMedia(MEMORIZATION_WORD_CHOICE_COMFORTABLE_MEDIA_QUERY)
    const applyRowCount = (isComfortableWidth: boolean) => {
      const next = memorizationWordChoiceRowCount(isComfortableWidth)
      setRowCount((prev) => (prev === next ? prev : next))
    }
    applyRowCount(mediaQuery.matches)
    const onChange = (event: MediaQueryListEvent) => {
      applyRowCount(event.matches)
    }
    mediaQuery.addEventListener('change', onChange)
    return () => mediaQuery.removeEventListener('change', onChange)
  }, [])

  return rowCount
}

export function MemorizationWordChoicesFooter({
  labels,
  targetKind,
  onGuess,
}: MemorizationWordChoicesFooterProps) {
  const rowCount = useMemorizationWordChoiceRowCount()
  const choiceRows = useMemo(
    () => splitMemorizationChoiceRows(labels, rowCount),
    [labels, rowCount]
  )
  const isDigit = targetKind === 'digit'

  return (
    <div
      className="shrink-0 border-t border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/60"
      data-testid="memorize-word-choices"
    >
      <div
        className="overflow-y-auto overscroll-y-contain px-4 py-3 touch-pan-y"
        style={{ minHeight: memorizationWordChoicesPanelMinHeight(rowCount) }}
      >
        <div className="flex w-full max-w-2xl mx-auto flex-col justify-center gap-4">
          {choiceRows.map((row, rowIdx) => (
            <div
              key={`row-${rowIdx}`}
              className="flex flex-nowrap justify-center gap-x-4 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]"
              data-testid="memorize-word-choice-row"
            >
              {row.map((label, choiceIdx) => (
                <button
                  key={`${rowIdx}-${choiceIdx}-${label}`}
                  type="button"
                  onClick={() => onGuess(label)}
                  className={
                    isDigit
                      ? 'shrink-0 min-w-11 px-4 py-2.5 sm:px-3 sm:py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-base font-medium tabular-nums whitespace-nowrap text-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors'
                      : 'max-w-full w-max shrink-0 px-4 py-3 sm:px-3 sm:py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-medium text-center leading-snug whitespace-normal wrap-anywhere hyphens-auto hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors'
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
