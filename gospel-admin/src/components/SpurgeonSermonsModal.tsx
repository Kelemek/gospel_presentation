'use client'

import { useId, useState, useEffect, useLayoutEffect, useCallback } from 'react'
import Link from 'next/link'

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
  const [searchItems, setSearchItems] = useState<SermonRow[]>([])
  const [refItems, setRefItems] = useState<SermonRow[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [refLoading, setRefLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [refError, setRefError] = useState('')
  const [searchTotal, setSearchTotal] = useState(0)

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q.trim()), 320)
    return () => window.clearTimeout(t)
  }, [q])

  const loadSearch = useCallback(async () => {
    setSearchLoading(true)
    setSearchError('')
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '30' })
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
  }, [debouncedQ])

  useEffect(() => {
    if (!isOpen || tab !== 'search') return
    void loadSearch()
  }, [isOpen, tab, loadSearch])

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

  const runScriptureLookup = () => void runScriptureLookupForRef(scriptureRef)

  useEffect(() => {
    if (!isOpen) {
      setTab('search')
      setQ('')
      setDebouncedQ('')
      setScriptureRef('')
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
    if (!isOpen || !initialByReference?.trim()) return
    void runScriptureLookupForRef(initialByReference.trim())
  }, [isOpen, initialByReference, runScriptureLookupForRef])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 dark:bg-black/70"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col"
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

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
          {tab === 'search' && (
            <>
              <label className="block text-sm text-slate-600 dark:text-slate-300">
                <span className="sr-only">Search by title or sermon code</span>
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Keyword or slug (e.g. sg00001)"
                  className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                  autoComplete="off"
                  data-tour="spurgeon-modal-search"
                />
              </label>
              {searchError && (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {searchError}
                </p>
              )}
              {searchLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                </div>
              ) : searchItems.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No matching public sermons.</p>
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
                        className="block rounded-md px-2 py-2 text-sm text-blue-700 dark:text-blue-300 hover:bg-slate-100 dark:hover:bg-slate-700/80"
                      >
                        {row.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {searchTotal > searchItems.length && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Showing {searchItems.length} of {searchTotal}. Refine your search to narrow results.
                </p>
              )}
            </>
          )}

          {tab === 'scripture' && (
            <>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={scriptureRef}
                  onChange={(e) => setScriptureRef(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void runScriptureLookup()}
                  placeholder="e.g. John 3:16"
                  className="flex-1 px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  aria-label="Scripture reference"
                  data-tour="spurgeon-modal-by-ref"
                />
                <button
                  type="button"
                  onClick={() => void runScriptureLookup()}
                  disabled={refLoading}
                  className="shrink-0 px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {refLoading ? 'Searching…' : 'Find sermons'}
                </button>
              </div>
              {refError && (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {refError}
                </p>
              )}
              {!refLoading && refItems.length === 0 && scriptureRef.trim() && !refError && (
                <p className="text-sm text-slate-500 dark:text-slate-400">No indexed sermons for that reference.</p>
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
                        className="block rounded-md px-2 py-2 text-sm text-blue-700 dark:text-blue-300 hover:bg-slate-100 dark:hover:bg-slate-700/80"
                      >
                        {row.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
