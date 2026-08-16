'use client'

export function MemorizationPracticeSessionEmpty({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Memorize practice"
    >
      <div
        data-tour="memorize-practice-dialog"
        className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-600"
      >
        <p className="text-slate-700 dark:text-slate-200">No passage text to practice for this verse.</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-slate-100 rounded-lg"
        >
          Close
        </button>
      </div>
    </div>
  )
}
