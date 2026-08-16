'use client'

import type { MemorizationPracticeMode } from '@/lib/verseMemorizationStorage'

export type MemorizationPracticeModePickerDialogProps = {
  open: boolean
  modePickerTitleId: string
  reciteModeVisible: boolean
  reciteModeBlockedMessage: string | null
  onClose: () => void
  onSelectMode: (mode: MemorizationPracticeMode) => void
}

export function MemorizationPracticeModePickerDialog({
  open,
  modePickerTitleId,
  reciteModeVisible,
  reciteModeBlockedMessage,
  onClose,
  onSelectMode,
}: MemorizationPracticeModePickerDialogProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-110 flex items-center justify-center bg-black/40 dark:bg-black/50 p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={modePickerTitleId}
        data-tour="memorize-practice-mode-picker"
        className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-600"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id={modePickerTitleId}
          className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4"
        >
          Choose practice mode
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          <strong>Type mode:</strong> keyboard — first letter of each blank word and each reference digit.{' '}
          <strong>Initials mode:</strong> same typing as Type; all blanks every round; higher rounds replace more
          initials with dots on the cue row—typing correctly reveals your hidden dots there too.{' '}
          <strong>Word mode:</strong> tap choices in the bottom bar (no keyboard).{' '}
          <strong>Reorder mode:</strong> drag chunks into reading order.
          {reciteModeVisible && (
            <>
              {' '}
              <strong>Recite mode:</strong> record the verse, then see word-by-word accuracy.
            </>
          )}
        </p>
        {reciteModeBlockedMessage && (
          <p
            className="text-sm text-amber-700 dark:text-amber-400 mb-4"
            data-testid="memorize-recite-blocked-message"
            role="alert"
          >
            {reciteModeBlockedMessage}
          </p>
        )}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            data-tour="memorize-practice-mode-type"
            data-testid="memorize-practice-mode-type"
            onClick={() => onSelectMode('type')}
            className="w-full px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700"
          >
            Type mode
          </button>
          <button
            type="button"
            data-tour="memorize-practice-mode-initials"
            data-testid="memorize-practice-mode-initials"
            onClick={() => onSelectMode('firstLetters')}
            className="w-full px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700"
          >
            Initials mode
          </button>
          <button
            type="button"
            data-tour="memorize-practice-mode-word"
            data-testid="memorize-practice-mode-word"
            onClick={() => onSelectMode('word')}
            className="w-full px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700"
          >
            Word mode
          </button>
          <button
            type="button"
            data-tour="memorize-practice-mode-reorder"
            data-testid="memorize-practice-mode-reorder"
            onClick={() => onSelectMode('reorder')}
            className="w-full px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700"
          >
            Reorder mode
          </button>
          {reciteModeVisible && (
            <button
              type="button"
              data-testid="memorize-practice-mode-recite"
              onClick={() => onSelectMode('recite')}
              className="w-full px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700"
            >
              <span className="inline-flex items-center justify-center gap-2">
                Recite mode
                <span
                  className="text-[0.65rem] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-200 dark:border-amber-700"
                >
                  Beta
                </span>
              </span>
            </button>
          )}
          <button
            type="button"
            data-testid="memorize-practice-mode-cancel"
            onClick={onClose}
            className="w-full px-4 py-3 rounded-lg font-medium border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
