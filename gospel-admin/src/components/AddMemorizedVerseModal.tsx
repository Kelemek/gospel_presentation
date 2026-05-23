'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useAlertModal } from '@/contexts/AlertModalContext'
import type { BibleTranslation } from '@/lib/bible-translations'
import { BIBLE_BOOKS_PUBLIC } from '@/lib/bibleCanonPublic'
import { referenceBookNameFromApiBook } from '@/lib/bibleReferenceBookName'
import type { BibleBookPublic } from '@/lib/bible-structure-types'
import {
  memorizeAddBookFromReference,
  readMemorizeAddTestament,
  writeMemorizeAddTestament,
  type MemorizeAddTestament,
} from '@/lib/memorizationAddVersePrefs'
import { memorizationSaveFailureMessage } from '@/lib/memorizationSaveFailureMessage'
import { tryAddMemorizedVerse } from '@/lib/verseMemorizationStorage'

export interface AddMemorizedVerseModalProps {
  isOpen: boolean
  onClose: () => void
  translation: BibleTranslation
  /** When provided on open, switches to the correct testament and expands that book. */
  seedReference?: string | null
}

function buildReference(
  bookId: string,
  bookName: string,
  chapterNum: number,
  verseStart: number,
  verseEnd: number | null
): string {
  const book = referenceBookNameFromApiBook(bookId, bookName)
  if (verseEnd === null || verseEnd === verseStart) {
    return `${book} ${chapterNum}:${verseStart}`
  }
  const a = Math.min(verseStart, verseEnd)
  const b = Math.max(verseStart, verseEnd)
  return `${book} ${chapterNum}:${a}-${b}`
}

export default function AddMemorizedVerseModal({
  isOpen,
  onClose,
  translation,
  seedReference = null,
}: AddMemorizedVerseModalProps) {
  const { showAlert } = useAlertModal()
  const [testament, setTestament] = useState<MemorizeAddTestament>(() => readMemorizeAddTestament())

  const [expandedBookId, setExpandedBookId] = useState<string | null>(null)
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null)
  const [selectedChapterNum, setSelectedChapterNum] = useState<number | null>(null)
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [selectedBookName, setSelectedBookName] = useState<string>('')

  const [verseCount, setVerseCount] = useState<number | null>(null)
  const [verseStart, setVerseStart] = useState<number | null>(null)
  const [verseEnd, setVerseEnd] = useState<number | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const verseSectionRef = useRef<HTMLDivElement>(null)
  const bookListScrollRef = useRef<HTMLDivElement>(null)
  const bookRowRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())

  const filteredBooks = useMemo(
    () => BIBLE_BOOKS_PUBLIC.filter((b) => b.testament === testament),
    [testament]
  )

  const resetSelection = useCallback(() => {
    setSelectedChapterId(null)
    setSelectedChapterNum(null)
    setVerseCount(null)
    setVerseStart(null)
    setVerseEnd(null)
  }, [])

  const setTestamentAndRemember = useCallback(
    (next: MemorizeAddTestament) => {
      setTestament(next)
      writeMemorizeAddTestament(next)
      setExpandedBookId(null)
      setSelectedBookId(null)
      setSelectedBookName('')
      resetSelection()
    },
    [resetSelection]
  )

  useLayoutEffect(() => {
    if (!isOpen) return
    const el = bookListScrollRef.current
    if (el) el.scrollTop = 0
  }, [testament, isOpen])

  useLayoutEffect(() => {
    if (!isOpen) return
    setExpandedBookId(null)
    setSelectedBookId(null)
    setSelectedBookName('')
    resetSelection()
    const seed = seedReference?.trim()
    if (!seed) return
    const book = memorizeAddBookFromReference(seed)
    if (!book) return
    setTestament(book.testament)
    writeMemorizeAddTestament(book.testament)
    setExpandedBookId(book.id)
  }, [isOpen, resetSelection, seedReference])

  const onChapterClick = useCallback((book: BibleBookPublic, chapterId: string, chapterNumber: number) => {
    const ch = book.chapters.find((c) => c.id === chapterId)
    setSelectedBookId(book.id)
    setSelectedBookName(book.name)
    setSelectedChapterId(chapterId)
    setSelectedChapterNum(chapterNumber)
    setVerseStart(null)
    setVerseEnd(null)
    setVerseCount(typeof ch?.verseCount === 'number' ? ch.verseCount : 0)
  }, [])

  const onVerseClick = useCallback((v: number) => {
    if (verseStart === null) {
      setVerseStart(v)
      setVerseEnd(null)
      return
    }
    if (verseEnd === null) {
      if (v === verseStart) return
      setVerseStart(Math.min(v, verseStart))
      setVerseEnd(Math.max(v, verseStart))
      return
    }
    setVerseStart(v)
    setVerseEnd(null)
  }, [verseStart, verseEnd])

  const onAdd = useCallback(async () => {
    if (
      selectedBookId === null ||
      selectedChapterNum === null ||
      verseStart === null ||
      !selectedBookName
    ) {
      return
    }
    const ref = buildReference(selectedBookId, selectedBookName, selectedChapterNum, verseStart, verseEnd)
    setSubmitting(true)
    try {
      const params = new URLSearchParams({ reference: ref, translation })
      const res = await fetch(`/api/scripture?${params.toString()}`, { cache: 'no-store' })
      const data = (await res.json()) as { text?: string; error?: string }
      if (!res.ok) {
        throw new Error(data.error || 'Could not load scripture text')
      }
      const text = data.text ?? ''
      if (!text.trim()) {
        showAlert('No text returned for this passage.')
        return
      }
      const result = await tryAddMemorizedVerse(ref, text, translation)
      if (result.ok) {
        showAlert('Added to memorization list.\n\nYou can find this verse under Memorize in the menu.')
        onClose()
      } else {
        showAlert(memorizationSaveFailureMessage(result.reason))
      }
    } catch (e: unknown) {
      showAlert(e instanceof Error ? e.message : 'Failed to add passage.')
    } finally {
      setSubmitting(false)
    }
  }, [
    onClose,
    selectedBookId,
    selectedBookName,
    selectedChapterNum,
    showAlert,
    translation,
    verseEnd,
    verseStart,
  ])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  useLayoutEffect(() => {
    if (!isOpen || !expandedBookId) return
    const id = requestAnimationFrame(() => {
      const el = bookRowRefs.current.get(expandedBookId)
      if (!el) return
      const reducedMotion =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({
          block: 'start',
          behavior: reducedMotion ? 'instant' : 'smooth',
        })
      }
    })
    return () => cancelAnimationFrame(id)
  }, [expandedBookId, isOpen])

  useEffect(() => {
    if (!selectedChapterId) return
    const id = requestAnimationFrame(() => {
      const el = verseSectionRef.current
      if (!el) return
      const reducedMotion =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({
          block: 'start',
          behavior: reducedMotion ? 'instant' : 'smooth',
        })
      }
    })
    return () => cancelAnimationFrame(id)
  }, [selectedChapterId])

  if (!isOpen) return null

  const canAdd =
    selectedBookId !== null &&
    selectedChapterNum !== null &&
    verseStart !== null &&
    !submitting &&
    verseCount !== null &&
    verseCount > 0

  const verseNumbers =
    verseCount !== null && verseCount > 0 ? Array.from({ length: verseCount }, (_, i) => i + 1) : []

  const inRange = (n: number): boolean => {
    if (verseStart === null) return false
    if (verseEnd === null) return n === verseStart
    const lo = Math.min(verseStart, verseEnd)
    const hi = Math.max(verseStart, verseEnd)
    return n >= lo && n <= hi
  }

  const headingText =
    selectedChapterId !== null ? 'Pick Verse Range' : 'Pick Chapter'

  return (
    <div
      className="fixed inset-0 z-60 flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/50 dark:bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-memorized-verse-title"
      data-tour="add-memorize-modal"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg max-h-[min(92vh,720px)] flex flex-col bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-xl shadow-xl border border-slate-200 dark:border-slate-600 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800">
          <h2 id="add-memorized-verse-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {headingText}
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

        <div className="flex-1 min-h-0 flex flex-col">
          <div className="shrink-0 px-3 pt-3">
            <div
              data-tour="add-memorize-testaments"
              className="flex rounded-lg border border-slate-200 dark:border-slate-600 p-0.5 bg-slate-100 dark:bg-slate-900/50 mb-3"
            >
              <button
                type="button"
                onClick={() => setTestamentAndRemember('ot')}
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
                onClick={() => setTestamentAndRemember('nt')}
                className={`flex-1 cursor-pointer py-2.5 text-sm font-medium rounded-md transition-colors ${
                  testament === 'nt'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                New Testament
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 px-1 pb-1">
              Books like 1 Peter, 2 Timothy, and Psalms are listed under the matching testament tab.
            </p>
          </div>

          <div ref={bookListScrollRef} className="flex-1 min-h-0 overflow-y-auto px-3 pb-3">
          <div className="space-y-0 border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden">
              {filteredBooks.map((book) => {
                const open = expandedBookId === book.id
                return (
                  <div
                    key={book.id}
                    ref={(node) => {
                      if (node) bookRowRefs.current.set(book.id, node)
                      else bookRowRefs.current.delete(book.id)
                    }}
                    className="border-b border-slate-200 dark:border-slate-600 last:border-b-0 scroll-mt-3"
                  >
                    <button
                      type="button"
                      data-tour="add-memorize-book"
                      data-add-memorize-book-id={book.id}
                      onClick={() => {
                        if (open) {
                          setExpandedBookId(null)
                          return
                        }
                        setExpandedBookId(book.id)
                        if (selectedBookId !== book.id) {
                          resetSelection()
                          setSelectedBookId(null)
                          setSelectedBookName('')
                        }
                      }}
                      className="flex w-full cursor-pointer items-start justify-between gap-2 px-3 py-3 text-left text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700/80 min-h-[48px]"
                    >
                      <span className="font-medium min-w-0 flex-1 leading-snug">{book.name}</span>
                      <svg
                        className={`w-5 h-5 shrink-0 text-slate-500 mt-0.5 transition-transform ${open ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {open && (
                      <div className="px-3 pb-3 border-t border-slate-100 dark:border-slate-600/80 bg-slate-50/80 dark:bg-slate-900/30">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 pt-2 pb-1.5">Chapter</p>
                        <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(3rem,1fr))] gap-2">
                          {[...book.chapters]
                            .sort((a, b) => parseInt(a.number, 10) - parseInt(b.number, 10))
                            .map((ch) => {
                              const num = parseInt(ch.number, 10)
                              const selected = selectedChapterId === ch.id && selectedBookId === book.id
                              return (
                                <button
                                  key={ch.id}
                                  type="button"
                                  data-tour="add-memorize-chapter"
                                  data-add-memorize-chapter-number={num}
                                  onClick={() => onChapterClick(book, ch.id, num)}
                                  className={`min-h-[48px] w-full min-w-0 cursor-pointer rounded-lg text-sm font-medium border transition-colors touch-manipulation ${
                                    selected
                                      ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100 border-blue-300 dark:border-blue-600'
                                      : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'
                                  }`}
                                >
                                  {num}
                                </button>
                              )
                            })}
                        </div>

                        {selectedBookId === book.id && selectedChapterId && (
                          <div ref={verseSectionRef} className="mt-4 scroll-mt-3">
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 pb-1.5">Verse</p>
                            {verseNumbers.length > 0 && (
                              <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(3rem,1fr))] gap-2">
                                {verseNumbers.map((n) => {
                                  const on = inRange(n)
                                  return (
                                    <button
                                      key={n}
                                      type="button"
                                      data-tour="add-memorize-verse"
                                      data-add-memorize-verse-number={n}
                                      onClick={() => onVerseClick(n)}
                                      className={`min-h-[48px] w-full min-w-0 cursor-pointer rounded-lg text-sm font-medium border transition-colors touch-manipulation ${
                                        on
                                          ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100 border-blue-300 dark:border-blue-600'
                                          : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'
                                      }`}
                                    >
                                      {n}
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-200 dark:border-slate-600 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-slate-50 dark:bg-slate-900/40">
          <button
            type="button"
            data-tour="add-memorize-add"
            disabled={!canAdd}
            onClick={() => void onAdd()}
            className="w-full min-h-[48px] cursor-pointer rounded-lg font-medium border border-blue-300 dark:border-blue-600 bg-blue-100 text-blue-900 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-100 dark:hover:bg-blue-900/65 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}
