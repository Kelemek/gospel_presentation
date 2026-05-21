'use client'

import { useEffect, useId, useRef } from 'react'
import ScriptureWordStudyPanel from '@/components/ScriptureWordStudyPanel'

interface ScriptureWordStudyModalProps {
  reference: string
  isOpen: boolean
  onClose: () => void
}

/**
 * Floats over the scripture reader scroll area (absolute inset-0 inside the verse pane),
 * so English text stays visible underneath. Not a separate full-viewport modal.
 */
export default function ScriptureWordStudyModal({
  reference,
  isOpen,
  onClose,
}: ScriptureWordStudyModalProps) {
  const titleId = useId()
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col min-h-0 bg-slate-900/55 dark:bg-black/65"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-tour="scripture-modal-word-study-overlay"
      onClick={onClose}
    >
      <div
        className="scripture-word-study-card relative z-10 flex flex-col flex-1 min-h-0 max-h-full mx-2 mt-2 mb-2 sm:mx-3 sm:mt-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700">
          <h2
            id={titleId}
            className="text-sm md:text-base font-semibold text-slate-800 dark:text-slate-100 min-w-0 truncate"
            title={reference}
          >
            Word study — {reference}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-slate-600 dark:text-slate-200 text-xl font-bold h-9 min-h-[36px] min-w-[36px] rounded-md inline-flex items-center justify-center leading-none bg-white dark:bg-slate-600 shadow-sm ring-1 ring-slate-300/80 dark:ring-slate-500/60 hover:bg-slate-50 dark:hover:bg-slate-500 shrink-0"
            aria-label="Close word study"
          >
            ×
          </button>
        </div>
        <div
          className="flex-1 min-h-0 overflow-hidden relative"
          data-tour="scripture-modal-word-study-panel"
        >
          <ScriptureWordStudyPanel reference={reference} enabled embedded />
        </div>
      </div>
    </div>
  )
}
