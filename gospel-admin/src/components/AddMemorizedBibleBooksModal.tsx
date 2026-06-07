'use client'

import { useCallback, useState } from 'react'
import { useAlertModal } from '@/contexts/AlertModalContext'
import BibleBooksMemorizationList from '@/components/BibleBooksMemorizationList'
import {
  bibleBooksCountLabel,
  bibleBooksReferenceLabel,
  type BibleBooksMemorizationScope,
} from '@/lib/bibleBooksMemorization'
import { memorizationSaveFailureMessage } from '@/lib/memorizationSaveFailureMessage'
import type { BibleTranslation } from '@/lib/bible-translations'
import { tryAddMemorizedBibleBooks } from '@/lib/verseMemorizationStorage'

export interface AddMemorizedBibleBooksModalProps {
  isOpen: boolean
  onClose: () => void
  translation: BibleTranslation
}

const SCOPE_OPTIONS: { value: BibleBooksMemorizationScope; label: string; detail: string }[] = [
  { value: 'all', label: 'All 66 books', detail: 'Old and New Testament' },
  { value: 'ot', label: 'Old Testament', detail: '39 books' },
  { value: 'nt', label: 'New Testament', detail: '27 books' },
]

export default function AddMemorizedBibleBooksModal({
  isOpen,
  onClose,
  translation,
}: AddMemorizedBibleBooksModalProps) {
  const { showAlert } = useAlertModal()
  const [scope, setScope] = useState<BibleBooksMemorizationScope>('all')
  const [submitting, setSubmitting] = useState(false)

  const handleAdd = useCallback(async () => {
    setSubmitting(true)
    try {
      const result = await tryAddMemorizedBibleBooks(scope, translation)
      if (result.ok) {
        showAlert(
          `Added ${bibleBooksReferenceLabel(scope)} to your memorization list.\n\nYou can find it under Memorize in the menu.`
        )
        onClose()
      } else if (result.reason === 'duplicate') {
        showAlert(`${bibleBooksReferenceLabel(scope)} is already in your memorization list.`)
      } else {
        showAlert(memorizationSaveFailureMessage(result.reason))
      }
    } finally {
      setSubmitting(false)
    }
  }, [onClose, scope, showAlert, translation])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-60 flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/50 dark:bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-memorized-bible-books-title"
      data-tour="add-bible-books-modal"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg max-h-[min(92vh,720px)] flex flex-col bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-xl shadow-xl border border-slate-200 dark:border-slate-600 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800">
          <h2 id="add-memorized-bible-books-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Bible Books
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col px-4 py-3 overflow-hidden">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            Choose which books to memorize in order. Practice uses the same games as verse memorization.
          </p>

          <div
            data-tour="add-bible-books-scope"
            className="shrink-0 flex flex-col gap-2 mb-3"
            role="radiogroup"
            aria-label="Bible books scope"
          >
            {SCOPE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                  scope === opt.value
                    ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-950/40'
                    : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <input
                  type="radio"
                  name="bible-books-scope"
                  value={opt.value}
                  checked={scope === opt.value}
                  onChange={() => setScope(opt.value)}
                  className="mt-1 shrink-0"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">{opt.label}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">{opt.detail}</span>
                </span>
              </label>
            ))}
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
            {bibleBooksCountLabel(scope)}
          </p>

          <BibleBooksMemorizationList scope={scope} tourPrefix="add-bible-books" className="flex-1 min-h-0" />
        </div>

        <div className="shrink-0 border-t border-slate-200 dark:border-slate-600 px-4 py-3 bg-slate-50 dark:bg-slate-900/60">
          <button
            type="button"
            data-tour="add-bible-books-add"
            disabled={submitting}
            onClick={() => void handleAdd()}
            className="w-full min-h-[48px] cursor-pointer rounded-lg font-medium transition-colors bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white"
          >
            {submitting ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}
