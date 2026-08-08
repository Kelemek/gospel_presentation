'use client'

import { useEffect, useId, useRef, useState } from 'react'
import ScriptureWordStudyPanel, {
  type WordStudyScrollEdges,
} from '@/components/ScriptureWordStudyPanel'
import { usePostHogModalMount } from '@/hooks/usePostHogModalOpen'

interface ScriptureWordStudyModalProps {
  reference: string
  isOpen: boolean
  onClose: () => void
  onOpenReference?: (reference: string) => void
}

const WORD_STUDY_HEADER_SCROLL_SHADOW =
  'shadow-[0_10px_28px_rgba(0,0,0,0.28)] dark:shadow-[0_10px_28px_rgba(0,0,0,0.5)]'

/** Inset upward shadow on the scroll pane — mirrors the header drop shadow without a bottom chrome strip. */
const WORD_STUDY_PANEL_BOTTOM_SCROLL_SHADOW =
  'shadow-[inset_0_-28px_28px_-28px_rgba(0,0,0,0.28)] dark:shadow-[inset_0_-28px_28px_-28px_rgba(0,0,0,0.5)]'

const INITIAL_SCROLL_EDGES: WordStudyScrollEdges = { fromTop: false, fromBottom: false }

/**
 * Floats over the scripture reader scroll area (absolute inset-0 inside the verse pane),
 * so English text stays visible underneath. Not a separate full-viewport modal.
 */
export default function ScriptureWordStudyModal({
  reference,
  isOpen,
  onClose,
  onOpenReference,
}: ScriptureWordStudyModalProps) {
  usePostHogModalMount('scripture_word_study', { reference })
  const titleId = useId()
  const onCloseRef = useRef(onClose)
  const scrollShadowEpoch = `${isOpen}:${reference}`
  const [scrollShadowEpochState, setScrollShadowEpochState] = useState(scrollShadowEpoch)
  const [scrollEdges, setScrollEdges] = useState<WordStudyScrollEdges>(INITIAL_SCROLL_EDGES)

  if (scrollShadowEpochState !== scrollShadowEpoch) {
    setScrollShadowEpochState(scrollShadowEpoch)
    setScrollEdges(INITIAL_SCROLL_EDGES)
  }

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
      className="absolute inset-0 z-30 flex flex-col min-h-0 overscroll-none bg-slate-900/55 dark:bg-black/65"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-tour="scripture-modal-word-study-overlay"
      onClick={onClose}
    >
      <div
        className="scripture-word-study-card relative z-10 flex flex-col flex-1 min-h-0 max-h-full w-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          data-tour="scripture-modal-word-study-header"
          className={`shrink-0 relative z-10 flex items-center justify-between gap-2 px-3 py-1.5 border-b border-slate-200 dark:border-slate-600 bg-slate-100/80 dark:bg-slate-700/80 transition-shadow ${
            scrollEdges.fromTop ? WORD_STUDY_HEADER_SCROLL_SHADOW : ''
          }`}
        >
          <h2
            id={titleId}
            className="text-sm font-semibold text-slate-800 dark:text-slate-100 min-w-0 truncate"
            title={reference}
          >
            Word study — {reference}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-slate-600 dark:text-slate-200 text-lg font-bold h-7 min-h-[28px] min-w-[28px] rounded-md inline-flex items-center justify-center leading-none bg-white dark:bg-slate-600 shadow-sm ring-1 ring-slate-300/80 dark:ring-slate-500/60 hover:bg-slate-50 dark:hover:bg-slate-500 shrink-0"
            aria-label="Close word study"
          >
            ×
          </button>
        </div>
        <div
          className={`flex-1 min-h-0 overflow-hidden relative transition-shadow ${
            scrollEdges.fromTop ? WORD_STUDY_PANEL_BOTTOM_SCROLL_SHADOW : ''
          }`}
          data-tour="scripture-modal-word-study-panel"
        >
          <ScriptureWordStudyPanel
            reference={reference}
            enabled
            embedded
            onOpenReference={onOpenReference}
            onContentScrollEdgesChange={setScrollEdges}
          />
        </div>
      </div>
    </div>
  )
}
