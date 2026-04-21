'use client'

interface FourRulesModalProps {
  isOpen: boolean
  onClose: () => void
}

const FOUR_RULES_HEADERS = [
  'Rule One - Be Honest',
  'Rule Two - Keep Current',
  'Rule Three – Attack the Problem, Not the Person',
  'Rule Four – Act, Don\'t React',
]

export default function FourRulesModal({ isOpen, onClose }: FourRulesModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Four Rules of Communication</h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-6 text-slate-700 dark:text-slate-200">
          <ol className="list-decimal list-inside space-y-3 text-base md:text-lg">
            {FOUR_RULES_HEADERS.map((rule, index) => (
              <li key={index} className="font-medium text-slate-800 dark:text-slate-100">
                {rule}
              </li>
            ))}
          </ol>
        </div>

        <div className="sticky bottom-0 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-200 dark:border-slate-600 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[44px] cursor-pointer rounded-lg border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40 px-4 py-2.5 text-sm font-medium text-blue-800 dark:text-blue-100 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
