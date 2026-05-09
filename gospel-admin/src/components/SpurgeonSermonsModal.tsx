'use client'

import { useId, useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import Link from 'next/link'

import { spurgeonSermonTitleForModalDisplay } from '@/lib/spurgeon/sortBySpurgeonSermonSlug'
import {
  GOSPEL_PRESENTATION_READ_STATUS_CHANGED_EVENT,
  loadPresentationReadCompleteSlugs,
  PRESENTATION_READ_COMPLETE_STORAGE_KEY,
} from '@/lib/presentationReadCompleteStorage'

const SEARCH_PAGE_SIZE = 100

interface SpurgeonSermonsModalProps {
  isOpen: boolean
  onClose: () => void
  /** When set as the modal opens, switches to “By scripture”, fills the reference, and runs lookup (all matches). */
  initialByReference?: string | null
  /**
   * Called when the user follows a sermon profile link (before navigation).
   * Use this to dismiss stacked UI such as the scripture reader so the sermon opens as a normal full-page profile.
   */
  onFollowSermonLink?: () => void
}

type Tab = 'search' | 'scripture'

interface SermonRow {
  slug: string
  title: string
}

export default function SpurgeonSermonsModal({
  isOpen,
  onClose,
  initialByReference,
  onFollowSermonLink,
}: SpurgeonSermonsModalProps) {
  const titleId = useId()
  const [tab, setTab] = useState<Tab>('search')
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [scriptureRef, setScriptureRef] = useState('')
  const [debouncedScriptureRef, setDebouncedScriptureRef] = useState('')
  const [searchItems, setSearchItems] = useState<SermonRow[]>([])
  const [refItems, setRefItems] = useState<SermonRow[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [refLoading, setRefLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [refError, setRefError] = useState('')
  const [searchTotal, setSearchTotal] = useState(0)
  const [searchPage, setSearchPage] = useState(1)
  const searchListScrollRef = useRef<HTMLDivElement>(null)

  const [readCompleteSlugs, setReadCompleteSlugs] = useState<Set<string>>(() => new Set())

  const refreshReadCompleteSlugs = useCallback(() => {
    setReadCompleteSlugs(new Set(loadPresentationReadCompleteSlugs()))
  }, [])

  useEffect(() => {
    refreshReadCompleteSlugs()
    const onStatus = (e: Event) => {
      const ce = e as CustomEvent<{ slug: string; read: boolean }>
      if (!ce.detail?.slug) return
      setReadCompleteSlugs((prev) => {
        const next = new Set(prev)
        if (ce.detail.read) next.add(ce.detail.slug)
        else next.delete(ce.detail.slug)
        return next
      })
    }
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === PRESENTATION_READ_COMPLETE_STORAGE_KEY) refreshReadCompleteSlugs()
    }
    window.addEventListener(GOSPEL_PRESENTATION_READ_STATUS_CHANGED_EVENT, onStatus)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(GOSPEL_PRESENTATION_READ_STATUS_CHANGED_EVENT, onStatus)
      window.removeEventListener('storage', onStorage)
    }
  }, [refreshReadCompleteSlugs])

  useEffect(() => {
    const t = window.setTimeout(() => {
      const trimmed = q.trim()
      setDebouncedQ(trimmed)
      setSearchPage(1)
    }, 320)
    return () => window.clearTimeout(t)
  }, [q])

  /** Short debounce for by-reference API (same order of magnitude as title search). */
  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedScriptureRef(scriptureRef.trim())
    }, 350)
    return () => window.clearTimeout(t)
  }, [scriptureRef])

  const loadSearch = useCallback(async () => {
    setSearchLoading(true)
    setSearchError('')
    try {
      const params = new URLSearchParams({
        page: String(searchPage),
        pageSize: String(SEARCH_PAGE_SIZE),
      })
      if (debouncedQ) params.set('q', debouncedQ)
      const res = await fetch(`/api/spurgeon/sermons?${params.toString()}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) {
        setSearchError(typeof data.error === 'string' ? data.error : 'Could not load sermons')
        setSearchItems([])
        setSearchTotal(0)
        return
      }
      setSearchItems(Array.isArray(data.items) ? data.items : [])
      setSearchTotal(typeof data.total === 'number' ? data.total : (data.items?.length ?? 0))
    } catch {
      setSearchError('Could not load sermons')
      setSearchItems([])
      setSearchTotal(0)
    } finally {
      setSearchLoading(false)
    }
  }, [debouncedQ, searchPage])

  useEffect(() => {
    if (!isOpen || tab !== 'search') return
    void loadSearch()
  }, [isOpen, tab, loadSearch])

  useEffect(() => {
    const el = searchListScrollRef.current
    if (!el) return
    if (typeof el.scrollTo === 'function') {
      el.scrollTo({ top: 0, behavior: 'auto' })
    } else {
      el.scrollTop = 0
    }
  }, [searchPage, debouncedQ, tab])

  const runScriptureLookupForRef = useCallback(async (ref: string) => {
    const trimmed = ref.trim()
    if (!trimmed) {
      setRefItems([])
      setRefError('')
      return
    }
    setRefLoading(true)
    setRefError('')
    try {
      const res = await fetch(
        `/api/spurgeon/by-reference?reference=${encodeURIComponent(trimmed)}`,
        { cache: 'no-store' }
      )
      const data = await res.json()
      if (!res.ok) {
        setRefError(typeof data.error === 'string' ? data.error : 'Lookup failed')
        setRefItems([])
        return
      }
      setRefItems(Array.isArray(data.items) ? data.items : [])
    } catch {
      setRefError('Lookup failed')
      setRefItems([])
    } finally {
      setRefLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setTab('search')
      setQ('')
      setDebouncedQ('')
      setSearchPage(1)
      setScriptureRef('')
      setDebouncedScriptureRef('')
      setSearchItems([])
      setRefItems([])
      setSearchError('')
      setRefError('')
    }
  }, [isOpen])

  useLayoutEffect(() => {
    if (!isOpen || !initialByReference?.trim()) return
    setTab('scripture')
    setScriptureRef(initialByReference.trim())
  }, [isOpen, initialByReference])

  useEffect(() => {
    if (!isOpen || tab !== 'scripture') return
    void runScriptureLookupForRef(debouncedScriptureRef)
  }, [isOpen, tab, debouncedScriptureRef, runScriptureLookupForRef])

  if (!isOpen) return null

  const searchTotalPages = Math.max(1, Math.ceil(searchTotal / SEARCH_PAGE_SIZE))
  const searchFrom = searchTotal === 0 ? 0 : (searchPage - 1) * SEARCH_PAGE_SIZE + 1
  const searchTo = Math.min(searchPage * SEARCH_PAGE_SIZE, searchTotal)

  return (
    <div
      className="fixed inset-0 z-60 flex items-start justify-center overflow-x-hidden bg-black/50 dark:bg-black/70 pt-[max(2.5rem,env(safe-area-inset-top,0px))] sm:pt-[max(3.5rem,env(safe-area-inset-top,0px))] pb-[max(2rem,max(48px,env(safe-area-inset-bottom,0px)))] pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="min-w-0 bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-lg w-full max-h-[calc(100dvh-max(2.5rem,env(safe-area-inset-top,0px))-max(2rem,max(48px,env(safe-area-inset-bottom,0px))))] sm:max-h-[calc(100dvh-max(3.5rem,env(safe-area-inset-top,0px))-max(2rem,max(48px,env(safe-area-inset-bottom,0px))))] overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-gray-200 dark:border-slate-600 px-5 py-4 flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Spurgeon sermons
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="shrink-0 flex border-b border-slate-200 dark:border-slate-600 px-2 pt-2 gap-1">
          <button
            type="button"
            onClick={() => setTab('search')}
            className={`cursor-pointer px-3 py-2 text-sm font-medium rounded-t-md border-b-2 -mb-px transition-colors ${
              tab === 'search'
                ? 'border-blue-600 text-blue-700 dark:text-blue-300 dark:border-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => setTab('scripture')}
            className={`cursor-pointer px-3 py-2 text-sm font-medium rounded-t-md border-b-2 -mb-px transition-colors ${
              tab === 'scripture'
                ? 'border-blue-600 text-blue-700 dark:text-blue-300 dark:border-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            By scripture
          </button>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {tab === 'search' && (
            <div className="shrink-0 space-y-2 border-b border-slate-200 dark:border-slate-600 px-5 pt-4 pb-3">
              <label className="block text-sm text-slate-600 dark:text-slate-300">
                <span className="sr-only">Search by title or keyword</span>
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Title or keyword (e.g. grace)"
                  className="w-full min-w-0 px-3 py-2 text-base rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                  autoComplete="off"
                  data-tour="spurgeon-modal-search"
                />
              </label>
              {searchError && (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {searchError}
                </p>
              )}
            </div>
          )}

          {tab === 'scripture' && (
            <div className="shrink-0 space-y-2 border-b border-slate-200 dark:border-slate-600 px-5 pt-4 pb-3">
              <div className="flex flex-col gap-1">
                <label className="block text-sm text-slate-600 dark:text-slate-300">
                  <span className="sr-only">Scripture reference</span>
                  <input
                    type="text"
                    value={scriptureRef}
                    onChange={(e) => setScriptureRef(e.target.value)}
                    placeholder="e.g. John 3:16"
                    className="w-full min-w-0 px-3 py-2 text-base rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    aria-label="Scripture reference"
                    autoComplete="off"
                    data-tour="spurgeon-modal-by-ref"
                  />
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {refLoading ? 'Searching…' : 'Results update shortly after you stop typing.'}
                </p>
              </div>
              {refError && (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {refError}
                </p>
              )}
            </div>
          )}

          <div
            ref={searchListScrollRef}
            className="flex-1 min-h-0 overflow-y-auto px-5 py-3 space-y-4"
          >
            {tab === 'search' && (
              <>
                {/* Stable min-height so loading ↔ results does not shift the dialog vertically */}
                <div className="min-h-56">
                  {searchLoading ? (
                    <div className="flex h-56 items-center justify-center">
                      <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                    </div>
                  ) : searchItems.length === 0 ? (
                    <div className="flex h-56 items-start pt-2">
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        No matching public sermons.
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-1">
                      {searchItems.map((row) => (
                        <li key={row.slug}>
                          <Link
                            href={`/${row.slug}`}
                            onClick={() => {
                              onFollowSermonLink?.()
                              onClose()
                            }}
                            className={`block rounded-md px-2 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700/80 ${
                              readCompleteSlugs.has(row.slug)
                                ? 'font-extrabold text-blue-900 dark:text-blue-200'
                                : 'font-normal text-blue-700 dark:text-blue-300'
                            }`}
                          >
                            {spurgeonSermonTitleForModalDisplay(row.title)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}

            {tab === 'scripture' && (
              <div className="min-h-40">
                {!refLoading && refItems.length === 0 && scriptureRef.trim() && !refError && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No indexed sermons for that reference.
                  </p>
                )}
                {refItems.length > 0 && (
                  <ul className="space-y-1">
                    {refItems.map((row) => (
                      <li key={row.slug}>
                        <Link
                          href={`/${row.slug}`}
                          onClick={() => {
                            onFollowSermonLink?.()
                            onClose()
                          }}
                          className={`block rounded-md px-2 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700/80 ${
                            readCompleteSlugs.has(row.slug)
                              ? 'font-extrabold text-blue-900 dark:text-blue-200'
                              : 'font-normal text-blue-700 dark:text-blue-300'
                          }`}
                        >
                          {spurgeonSermonTitleForModalDisplay(row.title)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {tab === 'search' && !searchLoading && searchTotal > 0 && (
            <nav
              className="shrink-0 border-t border-slate-200 dark:border-slate-600 px-5 py-3 flex flex-wrap items-center justify-between gap-2 bg-slate-50/90 dark:bg-slate-900/80"
              aria-label="Sermon search pagination"
            >
              <p className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                {searchFrom}–{searchTo} of {searchTotal}
                {searchTotalPages > 1 ? ` · Page ${searchPage} of ${searchTotalPages}` : null}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSearchPage((p) => Math.max(1, p - 1))}
                  disabled={searchPage <= 1}
                  className="cursor-pointer px-3 py-1.5 text-sm font-medium rounded-md border-2 border-slate-400 dark:border-slate-500 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setSearchPage((p) => Math.min(searchTotalPages, p + 1))}
                  disabled={searchPage >= searchTotalPages}
                  className="cursor-pointer px-3 py-1.5 text-sm font-medium rounded-md border-2 border-slate-400 dark:border-slate-500 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
                >
                  Next
                </button>
              </div>
            </nav>
          )}
        </div>
      </div>
    </div>
  )
}
