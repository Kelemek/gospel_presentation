'use client'

import {
  MEMORIZE_LISTEN_CONTROLS_DIALOG_ID,
} from '@/lib/memorizationPracticeSessionHelpers'
import {
  isPracticePhaseInSession,
} from '@/lib/memorizationPracticePhase'
import type {
  MemorizationPracticeActionsSlice,
  MemorizationPracticeListenSlice,
  MemorizationPracticeModeSlice,
  MemorizationPracticeReciteSlice,
  MemorizationPracticeRoundSlice,
  MemorizationPracticeTypingSlice,
} from '@/lib/memorizationPracticeSessionContract'
import type { MemorizationPracticeVerseModel } from '@/lib/memorizationPracticeSessionTypes'
import type { MemorizedVerse } from '@/lib/verseMemorizationStorage'

export type MemorizationPracticeSessionToolbarProps = {
  verse: MemorizedVerse
  onOpenSpurgeonStudy?: (reference: string) => void
  verseModel: Pick<MemorizationPracticeVerseModel, 'isBibleBooks'>
  round: Pick<MemorizationPracticeRoundSlice, 'phase' | 'isRoundComplete' | 'showStartOver'>
  mode: Pick<MemorizationPracticeModeSlice, 'practiceMode'>
  recite: Pick<MemorizationPracticeReciteSlice, 'recitePhase'>
  typing: Pick<
    MemorizationPracticeTypingSlice,
    'hintActive' | 'hintButtonRef' | 'restorePracticeInputFocusAfterHint' | 'setHintHeld' | 'setHintPeekCount'
  >
  listen: Pick<
    MemorizationPracticeListenSlice,
    'spurgeonStudyMatch' | 'listenPanelVisible' | 'setListenPanelOpen'
  >
  actions: Pick<MemorizationPracticeActionsSlice, 'handleClose' | 'handleStartOver'>
  showListenOpeners: boolean
}

export function MemorizationPracticeSessionToolbar({
  verse,
  onOpenSpurgeonStudy,
  verseModel,
  round,
  mode,
  recite,
  typing,
  listen,
  actions,
  showListenOpeners,
}: MemorizationPracticeSessionToolbarProps) {
  const { isBibleBooks } = verseModel
  const { phase, isRoundComplete, showStartOver } = round
  const { practiceMode } = mode
  const { recitePhase } = recite
  const {
    hintActive,
    hintButtonRef,
    restorePracticeInputFocusAfterHint,
    setHintHeld,
    setHintPeekCount,
  } = typing
  const { spurgeonStudyMatch, listenPanelVisible, setListenPanelOpen } = listen
  const { handleClose, handleStartOver } = actions

  return (
    <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2 border-b border-slate-200 dark:border-slate-600 shrink-0">
      <div className="flex min-w-0 shrink items-center gap-2">
        {showListenOpeners && (
          <button
            type="button"
            data-tour="memorize-listen-open"
            data-testid="memorize-listen-open"
            onClick={() => {
              setListenPanelOpen(true)
            }}
            aria-expanded={listenPanelVisible}
            aria-controls={MEMORIZE_LISTEN_CONTROLS_DIALOG_ID}
            aria-label="Open Listen controls for this verse"
            className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            Listen
          </button>
        )}
        {onOpenSpurgeonStudy && !isBibleBooks && (
          <button
            type="button"
            data-tour="memorize-practice-spurgeon-study"
            data-testid="memorize-practice-spurgeon-study"
            disabled={
              !verse.reference.trim() ||
              spurgeonStudyMatch === 'loading' ||
              spurgeonStudyMatch === 'unset' ||
              spurgeonStudyMatch === 'no'
            }
            onClick={() => {
              const ref = verse.reference.trim()
              if (!ref || spurgeonStudyMatch !== 'yes') return
              void handleClose()
              onOpenSpurgeonStudy(ref)
            }}
            title={
              !verse.reference.trim()
                ? 'Open a passage to search study resources'
                : spurgeonStudyMatch === 'loading' || spurgeonStudyMatch === 'unset'
                  ? 'Checking indexed study resources…'
                  : spurgeonStudyMatch === 'no'
                    ? 'No indexed study resources for this passage'
                    : 'Search Spurgeon, devotions, and Calvin commentaries for this passage'
            }
            aria-label={
              !verse.reference.trim()
                ? 'Study: no passage selected'
                : spurgeonStudyMatch === 'loading' || spurgeonStudyMatch === 'unset'
                  ? 'Study: checking indexed resources'
                  : spurgeonStudyMatch === 'no'
                    ? 'Study: no indexed resources for this passage'
                    : 'Study: indexed resources for this passage'
            }
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border ${
              !verse.reference.trim() ||
              spurgeonStudyMatch === 'loading' ||
              spurgeonStudyMatch === 'unset' ||
              spurgeonStudyMatch === 'no'
                ? 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            Study
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {showStartOver && (
          <button
            type="button"
            data-testid="memorize-start-over"
            onClick={handleStartOver}
            className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            Start over
          </button>
        )}
        {isPracticePhaseInSession(phase) &&
          !isRoundComplete &&
          (practiceMode === 'type' ||
            practiceMode === 'firstLetters' ||
            practiceMode === 'word' ||
            practiceMode === 'reorder' ||
            (practiceMode === 'recite' && recitePhase === 'ready')) && (
          <button
            ref={hintButtonRef}
            type="button"
            data-testid="memorize-hint-button"
            tabIndex={-1}
            className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border border-blue-200 dark:border-blue-700 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-900/60 hover:border-blue-300 dark:hover:border-blue-600 active:bg-blue-200 dark:active:bg-blue-900/70 select-none touch-manipulation"
            aria-pressed={hintActive}
            aria-label={
              practiceMode === 'reorder'
                ? 'Hold to peek at the correct phrase for the first section still out of order'
                : 'Hold to peek at hidden words; adds the next word every second'
            }
            title={
              practiceMode === 'reorder'
                ? 'Hold to peek at the first wrong section'
                : 'Hold to peek; next blank every 1s while held'
            }
            onPointerDown={(e) => {
              e.preventDefault()
              setHintPeekCount(1)
              setHintHeld(true)
              try {
                e.currentTarget.setPointerCapture(e.pointerId)
              } catch {
                /* e.g. pointer type unsupported */
              }
            }}
            onPointerUp={(e) => {
              try {
                if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                  e.currentTarget.releasePointerCapture(e.pointerId)
                }
              } catch {
                /* ignore */
              }
              setHintPeekCount(1)
              setHintHeld(false)
              restorePracticeInputFocusAfterHint()
            }}
            onPointerLeave={(e) => {
              if (e.buttons !== 0) return
              setHintPeekCount(1)
              setHintHeld(false)
              restorePracticeInputFocusAfterHint()
            }}
            onPointerCancel={(e) => {
              try {
                if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                  e.currentTarget.releasePointerCapture(e.pointerId)
                }
              } catch {
                /* ignore */
              }
              setHintPeekCount(1)
              setHintHeld(false)
              restorePracticeInputFocusAfterHint()
            }}
          >
            Hint
          </button>
        )}
        <button
          type="button"
          data-tour="memorize-practice-close"
          onClick={() => void handleClose()}
          className="text-slate-600 dark:text-slate-200 text-xl font-bold min-h-[36px] min-w-[36px] rounded-md flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-600"
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </div>
  )
}
