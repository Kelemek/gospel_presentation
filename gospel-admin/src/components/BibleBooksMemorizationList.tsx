'use client'

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  bibleBooksTestamentsForScope,
  booksForScope,
  type BibleBooksMemorizationScope,
} from '@/lib/bibleBooksMemorization'
import type { MemorizeAddTestament } from '@/lib/memorizationAddVersePrefs'
import { readMemorizeAddTestament, writeMemorizeAddTestament } from '@/lib/memorizationAddVersePrefs'

export interface BibleBooksMemorizationListProps {
  scope: BibleBooksMemorizationScope
  /** Prefix for data-tour attributes (e.g. add-bible-books). */
  tourPrefix?: string
  className?: string
}

export default function BibleBooksMemorizationList({
  scope,
  tourPrefix,
  className = '',
}: BibleBooksMemorizationListProps) {
  const testaments = bibleBooksTestamentsForScope(scope)
  const showTabs = testaments.length > 1

  const [testament, setTestament] = useState<MemorizeAddTestament>(() => {
    if (scope === 'nt') return 'nt'
    if (scope === 'ot') return 'ot'
    return readMemorizeAddTestament()
  })

  const bookListScrollRef = useRef<HTMLDivElement>(null)

  const filteredBooks = useMemo(() => {
    if (!showTabs) return booksForScope(scope)
    return booksForScope(scope).filter((b) => b.testament === testament)
  }, [scope, showTabs, testament])

  useLayoutEffect(() => {
    const el = bookListScrollRef.current
    if (el) el.scrollTop = 0
  }, [testament, scope])

  const tour = (suffix: string) => (tourPrefix ? `${tourPrefix}-${suffix}` : undefined)

  return (
    <div className={className}>
      {showTabs && (
        <div
          data-tour={tour('testaments')}
          className="flex rounded-lg border border-slate-200 dark:border-slate-600 p-0.5 bg-slate-100 dark:bg-slate-900/50 mb-3"
        >
          <button
            type="button"
            onClick={() => {
              setTestament('ot')
              writeMemorizeAddTestament('ot')
            }}
            className={`flex-1 cursor-pointer py-2.5 text-sm font-medium rounded-md transition-colors ${
              testament === 'ot'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Old Testament
          </button>
          <button
            type="button"
            onClick={() => {
              setTestament('nt')
              writeMemorizeAddTestament('nt')
            }}
            className={`flex-1 cursor-pointer py-2.5 text-sm font-medium rounded-md transition-colors ${
              testament === 'nt'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            New Testament
          </button>
        </div>
      )}

      <div
        ref={bookListScrollRef}
        className="max-h-[min(50vh,360px)] overflow-y-auto overscroll-y-contain"
        data-testid="bible-books-memorization-list"
      >
        <div className="space-y-0 border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden">
          {filteredBooks.map((book) => (
            <div
              key={book.id}
              data-tour={tour('book')}
              data-bible-books-memorization-book-id={book.id}
              className="border-b border-slate-200 dark:border-slate-600 last:border-b-0 px-3 py-3 text-sm font-medium text-slate-800 dark:text-slate-100 min-h-[44px] flex items-center"
            >
              {book.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
