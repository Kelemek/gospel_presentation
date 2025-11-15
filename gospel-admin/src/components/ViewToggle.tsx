'use client'

import { ViewPreference } from '@/hooks/useViewPreference'

interface ViewToggleProps {
  view: ViewPreference
  onViewChange: (view: ViewPreference) => void
}

/**
 * Toggle button for switching between list and card views.
 */
export default function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
      <button
        onClick={() => onViewChange('list')}
        className={`px-2 sm:px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-all inline-flex items-center gap-1.5 ${
          view === 'list'
            ? 'bg-white text-slate-700 shadow-sm'
            : 'text-slate-600 hover:text-slate-700'
        }`}
        title="List view"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span className="hidden sm:inline">List</span>
      </button>
      <button
        onClick={() => onViewChange('card')}
        className={`px-2 sm:px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-all inline-flex items-center gap-1.5 ${
          view === 'card'
            ? 'bg-white text-slate-700 shadow-sm'
            : 'text-slate-600 hover:text-slate-700'
        }`}
        title="Card view"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm10 0a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2h-4a2 2 0 01-2-2V5zm-10 10a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zm10 0a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2h-4a2 2 0 01-2-2v-4z" />
        </svg>
        <span className="hidden sm:inline">Card</span>
      </button>
    </div>
  )
}
