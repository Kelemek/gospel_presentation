'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import AddMemorizedVerseModal from '@/components/AddMemorizedVerseModal'
import MemorizationPracticeSession from '@/components/MemorizationPracticeSession'
import { useAlertModal } from '@/contexts/AlertModalContext'
import { useTranslation } from '@/contexts/TranslationContext'
import {
  GOSPEL_MEMORIZATION_CHANGED_EVENT,
  clearMemorizationInProgress,
  getMasterLevel,
  loadMemorizedVerses,
  removeMemorizedVerse,
  saveMemorizationInProgress,
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
  const { translation } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [addVerseOpen, setAddVerseOpen] = useState(false)
  const [verses, setVerses] = useState<MemorizedVerse[]>(() => loadMemorizedVerses())
  const [practiceVerse, setPracticeVerse] = useState<MemorizedVerse | null>(null)

  const refresh = useCallback(() => {
    setVerses(loadMemorizedVerses())
  }, [])

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
        <div
          className="mt-1 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 shadow-sm overflow-hidden"
          role="list"
        >
          {list.map((v) => (
            <div
              key={v.id}
              role="listitem"
              className="flex border-b border-slate-100 dark:border-slate-600 last:border-b-0"
            >
              <button
                type="button"
                data-memorize-verse-practice={v.id}
                onClick={() => {
                  if (onMemorizationPracticeStart) {
                    onMemorizationPracticeStart(v)
                  } else {
                    onNavigate?.()
                    setPracticeVerse(v)
                  }
                }}
                className="min-w-0 flex-1 cursor-pointer text-left px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors"
              >
                <span className="font-medium text-slate-900 dark:text-slate-100 truncate block">
                  {v.reference}
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 block">
                  {v.translation.toUpperCase()}
                  {v.lastPracticedAt != null ? ` · Last: ${formatDate(v.lastPracticedAt)}` : ''}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-500 mt-0.5 block">
                  Sessions: {v.practiceSessions.filter((s) => s.completed).length} completed
                </span>
              </button>
              <button
                type="button"
                data-memorize-verse-id={v.id}
                onClick={(e) => void handleRemove(e, v.id)}
                className="shrink-0 flex cursor-pointer items-center justify-center px-3 min-h-[48px] text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-slate-50 dark:hover:bg-slate-700/80"
                aria-label={`Remove ${v.reference}`}
                title="Remove"
              >
                <svg
                  className="w-5 h-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div data-tour="toc-memorize-section" className="flex flex-col gap-3">
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
          <button
            type="button"
            data-tour="memorize-add-verse"
            onClick={() => setAddVerseOpen(true)}
            className="w-full min-h-[44px] cursor-pointer rounded-lg border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40 px-4 py-2.5 text-sm font-medium text-blue-800 dark:text-blue-100 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
          >
            + Add
          </button>
        )}
        {isOpen && (
          <div
            data-tour="memorize-panel"
            className="border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 shadow-sm overflow-hidden p-3 max-h-[min(70vh,480px)] overflow-y-auto"
            role="region"
            aria-label="Memorization list"
          >
            {verses.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 px-1 py-2">
                No verses saved yet. Tap{' '}
                <strong className="font-medium text-slate-600 dark:text-slate-300">+ Add</strong>
                {' '}
                to choose a verse, or open a scripture passage and choose &quot;Memorize this verse&quot;.
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

      {addVerseOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <AddMemorizedVerseModal
            isOpen={addVerseOpen}
            onClose={() => {
              setAddVerseOpen(false)
              refresh()
            }}
            translation={translation}
          />,
          document.body
        )}

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
            onPersistInProgress={(payload) => {
              saveMemorizationInProgress(practiceVerse.id, payload)
              refresh()
            }}
            onClearInProgress={() => {
              clearMemorizationInProgress(practiceVerse.id)
              refresh()
              setPracticeVerse(
                loadMemorizedVerses().find((v) => v.id === practiceVerse.id) ?? null
              )
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
