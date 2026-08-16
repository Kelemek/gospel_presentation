'use client'

import { practicePhaseDoneMessage } from '@/lib/memorizationPracticePhase'
import type { MemorizationPracticePhase } from '@/lib/memorizationPracticePhase'

type Props = {
  phase: MemorizationPracticePhase
  onClose: () => void
}

export function MemorizationPracticeDonePanel({ phase, onClose }: Props) {
  return (
    <div className="text-center py-6">
      <p
        className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3"
        data-testid="memorize-completion-message"
      >
        {practicePhaseDoneMessage(phase)}
      </p>
      <button
        type="button"
        onClick={onClose}
        className="mt-6 px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600"
      >
        Done
      </button>
    </div>
  )
}
