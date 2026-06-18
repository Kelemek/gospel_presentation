'use client'

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import type { BibleTranslation } from '@/lib/bible-translations'
import type { BibleSearchPage } from '@/lib/bible-search-api'
import { BIBLE_SEARCH_MIN_QUERY_LENGTH } from '@/lib/bible-search-api'
import { splitBibleSearchSnippetByQuery } from '@/lib/bibleSearchSnippetHighlight'
import {
  RESOURCE_SEARCH_ACTIVE_ATTR,
  RESOURCE_SEARCH_MATCH_ATTR,
} from '@/lib/profileResourceInPageSearch'
import { scriptureModalHeaderCloseButtonHoverOnlyClass } from '@/components/scriptureModalHeaderButtons'
import { isProfileResourceSearchContentTouchBlurHost } from '@/lib/memorizationViewportPlatform'
import { usePostHogModalOpen } from '@/hooks/usePostHogModalOpen'

const SEARCH_DEBOUNCE_MS = 250

function BibleSearchSnippet({ snippet, query }: { snippet: string; query: string }) {
  const parts = splitBibleSearchSnippetByQuery(snippet, query)
  return (
    <>
      {parts.map((part, index) =>
        part.match ? (
          <mark
            key={index}
            {...{
              [RESOURCE_SEARCH_MATCH_ATTR]: 'true',
              [RESOURCE_SEARCH_ACTIVE_ATTR]: 'true',
            }}
          >
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        )
      )}
    </>
  )
}

interface BibleSearchModalProps {
  isOpen: boolean
  onClose: () => void
  translation: BibleTranslation
  translationLabel: string
  session: BibleSearchPage | null
  onSessionChange: (session: BibleSearchPage | null) => void
  onSelectReference: (reference: string) => void
}

export default function BibleSearchModal({
  isOpen,
  onClose,
  translation,
  translationLabel,
  session,
  onSessionChange,
  onSelectReference,
}: BibleSearchModalProps) {
  usePostHogModalOpen('bible_search', isOpen, { translation })
  const titleId = useId()
  const inputId = useId()
  const [inputQ, setInputQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fetchSeqRef = useRef(0)
  const wasOpenRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false
      return
    }
    if (wasOpenRef.current) return
    wasOpenRef.current = true
    const nextQ = session?.query ?? ''
    setInputQ(nextQ)
    setDebouncedQ(nextQ)
    setPage(session?.page ?? 1)
    setError('')
  }, [isOpen, session])

  useEffect(() => {
    if (!isOpen) return
    const timer = window.setTimeout(() => {
      setDebouncedQ(inputQ.trim())
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [inputQ, isOpen])

  /** Dismiss the keyboard when tapping or clicking elsewhere in the modal (panel stays open). */
  useEffect(() => {
    if (!isOpen) return
    const panel = panelRef.current
    if (!panel) return

    const blurSearchIfOutside = (target: EventTarget | null) => {
      const input = inputRef.current
      if (!input || document.activeElement !== input) return
      if (!(target instanceof Node) || input.contains(target)) return
      input.blur()
    }

    const onTouchStart = (event: TouchEvent) => {
      if (!isProfileResourceSearchContentTouchBlurHost()) return
      blurSearchIfOutside(event.target)
    }

    const onMouseDown = (event: MouseEvent) => {
      blurSearchIfOutside(event.target)
    }

    panel.addEventListener('touchstart', onTouchStart, { passive: true })
    panel.addEventListener('mousedown', onMouseDown)
    return () => {
      panel.removeEventListener('touchstart', onTouchStart)
      panel.removeEventListener('mousedown', onMouseDown)
    }
  }, [isOpen])

  const runSearch = useCallback(
    async (query: string, targetPage: number) => {
      if (query.length < BIBLE_SEARCH_MIN_QUERY_LENGTH) {
        setError('')
        setLoading(false)
        return
      }

      const seq = ++fetchSeqRef.current
      setLoading(true)
      setError('')

      try {
        const params = new URLSearchParams({
          q: query,
          translation,
          page: String(targetPage),
        })
        const res = await fetch(`/api/scripture/search?${params}`)
        const body = (await res.json()) as BibleSearchPage & { error?: string }
        if (seq !== fetchSeqRef.current) return

        if (!res.ok) {
          onSessionChange(null)
          setError(typeof body.error === 'string' ? body.error : 'Search failed')
          return
        }

        onSessionChange(body)
        setPage(body.page)
      } catch {
        if (seq !== fetchSeqRef.current) return
        onSessionChange(null)
        setError('Search failed')
      } finally {
        if (seq === fetchSeqRef.current) {
          setLoading(false)
        }
      }
    },
    [onSessionChange, translation]
  )

  useEffect(() => {
    if (!isOpen) return
    if (debouncedQ.length < BIBLE_SEARCH_MIN_QUERY_LENGTH) {
      return
    }
    if (
      session &&
      session.translation === translation &&
      session.query === debouncedQ &&
      session.page === page
    ) {
      return
    }
    const timer = window.setTimeout(() => {
      void runSearch(debouncedQ, page)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [debouncedQ, page, isOpen, runSearch, session, translation])

  useEffect(() => {
    if (!isOpen) return
    if (session && session.translation !== translation) {
      onSessionChange(null)
    }
  }, [isOpen, onSessionChange, session, translation])

  const handleInputChange = (value: string) => {
    setInputQ(value)
    setPage(1)
    if (!value.trim()) {
      onSessionChange(null)
      setError('')
    }
  }

  const handlePreviousPage = () => {
    if (!session || page <= 1 || loading) return
    setPage((p) => Math.max(1, p - 1))
  }

  const handleNextPage = () => {
    if (!session || page >= session.totalPages || loading) return
    setPage((p) => p + 1)
  }

  if (!isOpen) return null

  const sessionMatchesQuery = session != null && session.query === debouncedQ
  const total = sessionMatchesQuery ? session.total : 0
  const totalPages = sessionMatchesQuery ? session.totalPages : 0
  const items = sessionMatchesQuery ? session.items : []

  return (
    <div
      className="fixed inset-0 z-60 flex items-start justify-center overflow-x-hidden bg-black/50 dark:bg-black/70 pt-[max(2.5rem,env(safe-area-inset-top,0))] sm:pt-[max(3.5rem,env(safe-area-inset-top,0))] pb-[max(2rem,max(48px,env(safe-area-inset-bottom,0)))] pl-[max(1rem,env(safe-area-inset-left,0))] pr-[max(1rem,env(safe-area-inset-right,0))]"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={panelRef}
        className="min-w-0 bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-lg w-full max-h-[calc(100dvh-max(2.5rem,env(safe-area-inset-top,0))-max(2rem,max(48px,env(safe-area-inset-bottom,0))))] sm:max-h-[calc(100dvh-max(3.5rem,env(safe-area-inset-top,0))-max(2rem,max(48px,env(safe-area-inset-bottom,0))))] overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-gray-200 dark:border-slate-600 px-5 py-4 flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Search Bible
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={scriptureModalHeaderCloseButtonHoverOnlyClass}
            aria-label="Close search"
          >
            ×
          </button>
        </div>

        <div className="shrink-0 px-5 py-3 border-b border-gray-100 dark:border-slate-700 space-y-2">
          <label htmlFor={inputId} className="sr-only">
            Search Bible text
          </label>
          <input
            ref={inputRef}
            id={inputId}
            type="search"
            value={inputQ}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Search words or phrases…"
            autoComplete="off"
            className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-base text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Searching in {translationLabel}
            {inputQ.trim().length > 0 && inputQ.trim().length < BIBLE_SEARCH_MIN_QUERY_LENGTH
              ? ` · Type at least ${BIBLE_SEARCH_MIN_QUERY_LENGTH} characters`
              : null}
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-3">
          {loading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Searching…</p>
          ) : error ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          ) : items.length === 0 && debouncedQ.length >= BIBLE_SEARCH_MIN_QUERY_LENGTH ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No verses found.</p>
          ) : items.length === 0 ? null : (
            <ul className="space-y-2">
              {items.map((hit) => (
                <li key={`${hit.reference}-${hit.snippet.slice(0, 40)}`}>
                  <button
                    type="button"
                    onClick={() => onSelectReference(hit.reference)}
                    className="w-full cursor-pointer text-left rounded-md border border-slate-200 dark:border-slate-600 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
                  >
                    <div className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                      {hit.reference}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-3">
                      <BibleSearchSnippet snippet={hit.snippet} query={debouncedQ} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {total > 0 && totalPages > 0 ? (
          <div
            className="shrink-0 border-t border-gray-200 dark:border-slate-600 px-5 py-3 flex items-center justify-between gap-3"
            aria-label="Bible search pagination"
          >
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {total.toLocaleString()} result{total === 1 ? '' : 's'}
              {totalPages > 1 ? ` · Page ${page} of ${totalPages}` : null}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePreviousPage}
                disabled={page <= 1 || loading}
                className="text-sm cursor-pointer px-2 py-1 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-slate-200"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={page >= totalPages || loading}
                className="text-sm cursor-pointer px-2 py-1 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-slate-200"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
