'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import MemorizationPracticeSession from '@/components/MemorizationPracticeSession'
import { useAlertModal } from '@/contexts/AlertModalContext'
import {
  GOSPEL_MEMORIZATION_CHANGED_EVENT,
  getMasterLevel,
  loadMemorizedVerses,
  removeMemorizedVerse,
  updatePracticeStats,
  type MemorizedVerse,
} from '@/lib/verseMemorizationStorage'

interface MemorizeDropdownProps {
  onNavigate?: () => void
  /** Parent renders the practice modal and can close the menu; if omitted, this component portals the session locally. */
  onMemorizationPracticeStart?: (verse: MemorizedVerse) => void
}

function formatDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function groupByLevel(verses: MemorizedVerse[]) {
  const learning: MemorizedVerse[] = []
  const practicing: MemorizedVerse[] = []
  const mastered: MemorizedVerse[] = []
  for (const v of verses) {
    const level = getMasterLevel(v)
    if (level === 'learning') learning.push(v)
    else if (level === 'practicing') practicing.push(v)
    else mastered.push(v)
  }
  return { learning, practicing, mastered }
}

export default function MemorizeDropdown({
  onNavigate,
  onMemorizationPracticeStart,
}: MemorizeDropdownProps) {
  const { showConfirm } = useAlertModal()
  const [isOpen, setIsOpen] = useState(false)
  const [verses, setVerses] = useState<MemorizedVerse[]>([])
  const [practiceVerse, setPracticeVerse] = useState<MemorizedVerse | null>(null)

  const refresh = useCallback(() => {
    setVerses(loadMemorizedVerses())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const onChanged = () => refresh()
    window.addEventListener(GOSPEL_MEMORIZATION_CHANGED_EVENT, onChanged)
    window.addEventListener('storage', onChanged)
    return () => {
      window.removeEventListener(GOSPEL_MEMORIZATION_CHANGED_EVENT, onChanged)
      window.removeEventListener('storage', onChanged)
    }
  }, [refresh])

  const handleRemove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const confirmed = await showConfirm('Remove this verse from your memorization list?')
    if (confirmed) {
      removeMemorizedVerse(id)
      refresh()
    }
  }

  const { learning, practicing, mastered } = groupByLevel(verses)

  const renderGroup = (label: string, list: MemorizedVerse[]) => {
    if (list.length === 0) return null
    return (
      <div className="mb-3 last:mb-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 px-1 mb-1">
          {label}
        </p>
        <ul className="space-y-2">
          {list.map((v) => (
            <li
              key={v.id}
              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 p-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{v.reference}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {v.translation.toUpperCase()}
                    {v.lastPracticedAt != null ? ` · Last: ${formatDate(v.lastPracticedAt)}` : ''}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">
                    Sessions: {v.practiceSessions.filter((s) => s.completed).length} completed
                  </p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (onMemorizationPracticeStart) {
                        onMemorizationPracticeStart(v)
                      } else {
                        setPracticeVerse(v)
                      }
                    }}
                    className="w-full px-3 py-1 text-sm rounded-md transition-colors cursor-pointer flex items-center justify-center font-medium bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600"
                  >
                    Practice
                  </button>
                  <button
                    type="button"
                    data-memorize-verse-id={v.id}
                    onClick={(e) => void handleRemove(e, v.id)}
                    className="px-2 py-1 text-xs text-red-700 dark:text-red-300 hover:underline"
                    aria-label={`Remove ${v.reference}`}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <>
      <div data-tour="toc-memorize-section">
        <button
          type="button"
          data-tour="toc-memorize-toggle"
          onClick={() => {
            const next = !isOpen
            if (next) refresh()
            setIsOpen(next)
          }}
          className="inline-flex items-center w-full px-4 py-3 text-base md:text-lg font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 active:bg-slate-300 dark:active:bg-slate-500 border border-slate-300 dark:border-slate-600 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md min-h-[48px] cursor-pointer"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
        >
          <svg className="w-5 h-5 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          Memorize
          <span className={`ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>
        {isOpen && (
          <div
            data-tour="memorize-panel"
            className="mt-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 shadow-sm overflow-hidden p-3 max-h-[min(70vh,480px)] overflow-y-auto"
            role="region"
            aria-label="Memorization list"
          >
            {verses.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 px-1 py-2">
                No verses saved yet. Open a scripture and choose &quot;Memorize this verse&quot; to add one.
              </p>
            ) : (
              <>
                {renderGroup('Learning', learning)}
                {renderGroup('Practicing', practicing)}
                {renderGroup('Mastered', mastered)}
              </>
            )}
          </div>
        )}
      </div>

      {!onMemorizationPracticeStart &&
        practiceVerse &&
        typeof document !== 'undefined' &&
        createPortal(
          <MemorizationPracticeSession
            verse={practiceVerse}
            onClose={() => {
              setPracticeVerse(null)
              refresh()
            }}
            onComplete={(result) => {
              updatePracticeStats(practiceVerse.id, {
                wrongAttempts: result.wrongAttempts,
                correctKeystrokes: result.correctKeystrokes,
                completed: result.completed,
              })
              refresh()
            }}
          />,
          document.body
        )}
    </>
  )
}
