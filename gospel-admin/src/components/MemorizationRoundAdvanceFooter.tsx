'use client'

export interface MemorizationRoundAdvanceFooterProps {
  roundAffirmation: string
  showNextRoundOption: boolean
  showFinishPracticeOption: boolean
  onRepeatRound: () => void
  onNextRound: () => void
  onFinishPractice: () => void
}

export function MemorizationRoundAdvanceFooter({
  roundAffirmation,
  showNextRoundOption,
  showFinishPracticeOption,
  onRepeatRound,
  onNextRound,
  onFinishPractice,
}: MemorizationRoundAdvanceFooterProps) {
  return (
    <div
      className="shrink-0 border-t border-slate-200 dark:border-slate-600 px-4 py-3 bg-slate-50 dark:bg-slate-900/60"
      data-testid="memorize-round-advance-footer"
    >
      <p
        className="text-sm font-medium text-emerald-900 dark:text-emerald-100 text-center sm:text-left mb-3"
        data-testid="memorize-round-affirmation"
      >
        {roundAffirmation}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
        <button
          type="button"
          onClick={onRepeatRound}
          className="w-full sm:w-auto px-4 py-3 rounded-lg font-medium border-2 border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600"
        >
          Repeat this round
        </button>
        {showNextRoundOption && (
          <button
            type="button"
            data-testid="memorize-next-round"
            onClick={onNextRound}
            className="w-full sm:w-auto px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600"
          >
            Next round
          </button>
        )}
        {showFinishPracticeOption && (
          <button
            type="button"
            data-testid="memorize-finish-practice"
            onClick={onFinishPractice}
            className="w-full sm:w-auto px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:border-blue-600"
          >
            Finish practice
          </button>
        )}
      </div>
    </div>
  )
}
