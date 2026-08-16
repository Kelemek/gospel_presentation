'use client'

import type { MemorizationPracticeReciteSlice } from '@/lib/memorizationPracticeSessionContract'

export type MemorizationPracticeReciteFooterProps = {
  recite: MemorizationPracticeReciteSlice
}

export function MemorizationPracticeReciteFooter({ recite }: MemorizationPracticeReciteFooterProps) {
  const {
    recitePhase,
    reciteStarting,
    showReciteNextRoundOption,
    showReciteFinishOption,
    startReciteRecording,
    stopReciteRecording,
    onReciteRepeatRound,
    onReciteNextRound,
    onReciteFinishPractice,
  } = recite

  return (
    <div
      className="shrink-0 border-t border-slate-200 dark:border-slate-600 px-4 py-3 bg-slate-50 dark:bg-slate-900/60"
      data-testid="memorize-recite-footer"
    >
      <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
        {recitePhase === 'ready' && (
          <button
            type="button"
            data-testid="memorize-recite-record"
            onClick={() => void startReciteRecording()}
            disabled={reciteStarting}
            aria-busy={reciteStarting}
            className={`w-full sm:w-auto px-4 py-3 rounded-lg font-medium transition-colors bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-700 ${
              reciteStarting
                ? 'cursor-not-allowed opacity-80'
                : 'cursor-pointer hover:bg-red-200 dark:hover:bg-red-900/60'
            }`}
          >
            {reciteStarting ? 'Starting…' : 'Record'}
          </button>
        )}
        {recitePhase === 'recording' && (
          <button
            type="button"
            data-testid="memorize-recite-stop"
            onClick={() => void stopReciteRecording()}
            className="w-full sm:w-auto px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-700"
          >
            Stop
          </button>
        )}
        {(recitePhase === 'stopping' || recitePhase === 'transcribing') && (
          <button
            type="button"
            data-testid="memorize-recite-checking"
            disabled
            aria-busy="true"
            className="w-full sm:w-auto px-4 py-3 rounded-lg font-medium transition-colors cursor-not-allowed bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-700 inline-flex items-center justify-center gap-2 opacity-80"
          >
            <span
              className="animate-spin rounded-full h-4 w-4 border-2 border-red-800 border-t-transparent dark:border-red-200 dark:border-t-transparent"
              aria-hidden="true"
            />
            Checking…
          </button>
        )}
        {recitePhase === 'results' && (
          <>
            <button
              type="button"
              data-testid="memorize-recite-retry"
              onClick={onReciteRepeatRound}
              className="w-full sm:w-auto px-4 py-3 rounded-lg font-medium border-2 border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer"
            >
              Repeat this round
            </button>
            {showReciteNextRoundOption && (
              <button
                type="button"
                data-testid="memorize-recite-next-round"
                onClick={onReciteNextRound}
                className="w-full sm:w-auto px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700"
              >
                Next round
              </button>
            )}
            {showReciteFinishOption && (
              <button
                type="button"
                data-testid="memorize-recite-finish"
                onClick={onReciteFinishPractice}
                className="w-full sm:w-auto px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700"
              >
                Finish practice
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
