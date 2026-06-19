'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  formatVerseRangeSelectionLabel,
  isVerseInRange,
  type VerseRangeSelection,
} from '@/lib/bibleVerseRangeSelection'
import { usePostHogModalOpen } from '@/hooks/usePostHogModalOpen'

export const SCRIPTURE_CHAPTER_VERSE_PICKER_DIALOG_ID = 'scripture-chapter-verse-picker-dialog'
export const SCRIPTURE_CHAPTER_VERSE_PICKER_TITLE_ID = 'scripture-chapter-verse-picker-title'

export interface ScriptureChapterVersePickerDialogProps {
  open: boolean
  onClose: () => void
  chapterReference: string
  selection: VerseRangeSelection
  onVerseClick: (verse: number) => void
  onRead: () => void
  verseCount: number
  reading?: boolean
}

/**
 * Floating verse-range picker for scripture modal chapter view.
 * Position matches {@link MemorizeListenControlsDialog} `presentation="floating"`.
 */
export default function ScriptureChapterVersePickerDialog({
  open,
  onClose,
  chapterReference,
  selection,
  onVerseClick,
  onRead,
  verseCount,
  reading = false,
}: ScriptureChapterVersePickerDialogProps) {
  usePostHogModalOpen('scripture_chapter_verse_picker', open)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  const selectionLabel = formatVerseRangeSelectionLabel(selection)
  const canRead = selection.verseStart !== null && !reading
  const verseNumbers =
    verseCount > 0 ? Array.from({ length: verseCount }, (_, index) => index + 1) : []

  const panel = (
    <div
      id={SCRIPTURE_CHAPTER_VERSE_PICKER_DIALOG_ID}
      className="relative w-full max-w-md rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl"
      role="dialog"
      aria-modal={false}
      aria-labelledby={SCRIPTURE_CHAPTER_VERSE_PICKER_TITLE_ID}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-2 border-b border-slate-200 dark:border-slate-600 px-4 pt-3 pb-2">
        <div className="min-w-0">
          <h2
            id={SCRIPTURE_CHAPTER_VERSE_PICKER_TITLE_ID}
            className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate"
          >
            {chapterReference}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            {selectionLabel ?? 'Tap verses to select a range'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer shrink-0 text-slate-600 dark:text-slate-200 text-xl font-bold min-h-[36px] min-w-[36px] rounded-md flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-600"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="flex flex-col gap-3 p-4">
        {verseNumbers.length > 0 ? (
          <div
            className="max-h-[min(40vh,240px)] overflow-y-auto overscroll-contain -mx-1 px-1"
            data-tour="scripture-chapter-verse-picker-grid"
          >
            <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1.5">
              {verseNumbers.map((n) => {
                const selected = isVerseInRange(n, selection)
                return (
                  <button
                    key={n}
                    type="button"
                    data-scripture-chapter-picker-verse={n}
                    onClick={() => onVerseClick(n)}
                    className={`min-h-10 w-full min-w-0 cursor-pointer rounded-md text-sm font-medium border transition-colors touch-manipulation ${
                      selected
                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100 border-blue-300 dark:border-blue-600'
                        : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'
                    }`}
                    aria-pressed={selected}
                  >
                    {n}
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-2">
            Verse list unavailable for this chapter.
          </p>
        )}

        <button
          type="button"
          data-tour="scripture-chapter-verse-picker-read"
          disabled={!canRead}
          onClick={onRead}
          className="w-full min-h-12 px-4 rounded-lg font-medium text-center transition-colors cursor-pointer border border-blue-300 dark:border-blue-600 bg-blue-100 text-blue-900 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-100 dark:hover:bg-blue-900/65 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {reading ? 'Reading…' : 'Read'}
        </button>
      </div>
    </div>
  )

  return createPortal(
    <div className="fixed inset-x-0 top-0 z-120 flex justify-center px-4 pb-2 pointer-events-none pt-[calc(env(safe-area-inset-top,0)+3.5rem)]">
      <div className="pointer-events-auto w-full max-w-md">{panel}</div>
    </div>,
    document.body
  )
}
