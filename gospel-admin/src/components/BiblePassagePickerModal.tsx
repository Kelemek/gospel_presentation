'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { BIBLE_BOOKS_PUBLIC } from '@/lib/bibleCanonPublic'
import { buildBiblePassageReference } from '@/lib/buildBiblePassageReference'
import type { BibleBookPublic } from '@/lib/bible-structure-types'
import {
  memorizeAddBookFromReference,
  readMemorizeAddTestament,
  writeMemorizeAddTestament,
  type MemorizeAddTestament,
} from '@/lib/memorizationAddVersePrefs'
import { isChapterOnlyScriptureReference } from '@/lib/parse-scripture-reference'
import { usePostHogModalOpen } from '@/hooks/usePostHogModalOpen'
import ScriptureHoverModal from '@/components/ScriptureHoverModal'

export type BiblePassagePickerVariant = 'memorize' | 'reader'

export interface BiblePassagePickerConfirmMeta {
  initialChapterView: boolean
}

export interface BiblePassagePickerModalProps {
  isOpen: boolean
  onClose: () => void
  confirmLabel: 'Add' | 'Read'
  requireVerse: boolean
  onConfirm: (reference: string, meta: BiblePassagePickerConfirmMeta) => void | Promise<void>
  /** Controls data-tour prefixes and dialog title id (memorize keeps legacy ids for tours/tests). */
  variant?: BiblePassagePickerVariant
  /** When provided on open, switches to the correct testament and expands that book. */
  seedReference?: string | null
}

function tourAttr(variant: BiblePassagePickerVariant, suffix: string): string {
  return variant === 'memorize' ? `add-memorize-${suffix}` : `bible-reader-${suffix}`
}

function confirmTourAttr(variant: BiblePassagePickerVariant): string {
  return variant === 'memorize' ? 'add-memorize-add' : 'bible-reader-read'
}

function pickerStateFromSeed(seedReference: string | null): {
  testament: MemorizeAddTestament
  expandedBookId: string | null
} {
  const seed = seedReference?.trim()
  if (!seed) {
    return { testament: readMemorizeAddTestament(), expandedBookId: null }
  }
  const book = memorizeAddBookFromReference(seed)
  if (!book) {
    return { testament: readMemorizeAddTestament(), expandedBookId: null }
  }
  writeMemorizeAddTestament(book.testament)
  return { testament: book.testament, expandedBookId: book.id }
}

export default function BiblePassagePickerModal(props: BiblePassagePickerModalProps) {
  usePostHogModalOpen('bible_passage_picker', props.isOpen, {
    variant: props.variant ?? 'memorize',
  })
  if (!props.isOpen) return null
  return <BiblePassagePickerModalContent key={props.seedReference ?? ''} {...props} />
}

function BiblePassagePickerModalContent({
  onClose,
  confirmLabel,
  requireVerse,
  onConfirm,
  variant = 'memorize',
  seedReference = null,
}: BiblePassagePickerModalProps) {
  const titleId = variant === 'memorize' ? 'add-memorized-verse-title' : 'bible-reader-picker-title'
  const modalTour = variant === 'memorize' ? 'add-memorize-modal' : 'bible-reader-modal'

  const seedOnMount = pickerStateFromSeed(seedReference)
  const [testament, setTestament] = useState<MemorizeAddTestament>(seedOnMount.testament)

  const [expandedBookId, setExpandedBookId] = useState<string | null>(seedOnMount.expandedBookId)
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
    const el = bookListScrollRef.current
    if (el) el.scrollTop = 0
  }, [testament])

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

  const onConfirmClick = useCallback(async () => {
    if (selectedBookId === null || selectedChapterNum === null || !selectedBookName) {
      return
    }
    if (requireVerse && verseStart === null) {
      return
    }
    const ref = buildBiblePassageReference(
      selectedBookId,
      selectedBookName,
      selectedChapterNum,
      requireVerse ? verseStart : verseStart,
      verseEnd
    )
    const initialChapterView = requireVerse
      ? false
      : verseStart === null || isChapterOnlyScriptureReference(ref)

    setSubmitting(true)
    try {
      await onConfirm(ref, { initialChapterView })
    } finally {
      setSubmitting(false)
    }
  }, [
    onConfirm,
    requireVerse,
    selectedBookId,
    selectedBookName,
    selectedChapterNum,
    verseEnd,
    verseStart,
  ])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useLayoutEffect(() => {
    if (!expandedBookId) return
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
  }, [expandedBookId])

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

  const canConfirm = requireVerse
    ? selectedBookId !== null &&
      selectedChapterNum !== null &&
      verseStart !== null &&
      !submitting &&
      verseCount !== null &&
      verseCount > 0
    : selectedBookId !== null && selectedChapterNum !== null && !submitting

  const verseNumbers =
    verseCount !== null && verseCount > 0 ? Array.from({ length: verseCount }, (_, i) => i + 1) : []

  const inRange = (n: number): boolean => {
    if (verseStart === null) return false
    if (verseEnd === null) return n === verseStart
    const lo = Math.min(verseStart, verseEnd)
    const hi = Math.max(verseStart, verseEnd)
    return n >= lo && n <= hi
  }

  const headingText = selectedChapterId !== null ? 'Pick Verse Range' : 'Pick Chapter'

  const confirmPendingLabel = confirmLabel === 'Add' ? 'Adding…' : 'Reading…'

  return (
    <div
      className="fixed inset-0 z-60 flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/50 dark:bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-tour={modalTour}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg max-h-[min(92vh,720px)] flex flex-col bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-xl shadow-xl border border-slate-200 dark:border-slate-600 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800">
          <h2 id={titleId} className="text-lg font-semibold text-slate-900 dark:text-slate-100">
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
              data-tour={tourAttr(variant, 'testaments')}
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
                      data-tour={tourAttr(variant, 'book')}
                      data-bible-picker-book-id={book.id}
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
                                  data-tour={tourAttr(variant, 'chapter')}
                                  data-bible-picker-chapter-number={num}
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
                                  const verseReference =
                                    selectedChapterNum !== null
                                      ? on && verseStart !== null && verseEnd !== null
                                        ? buildBiblePassageReference(
                                            book.id,
                                            book.name,
                                            selectedChapterNum,
                                            verseStart,
                                            verseEnd
                                          )
                                        : buildBiblePassageReference(
                                            book.id,
                                            book.name,
                                            selectedChapterNum,
                                            n,
                                            null
                                          )
                                      : ''
                                  const hoverKey =
                                    on && verseStart !== null && verseEnd !== null
                                      ? `${selectedChapterId}-range-${verseStart}-${verseEnd}-${n}`
                                      : `${selectedChapterId}-${n}`
                                  return (
                                    <ScriptureHoverModal
                                      key={hoverKey}
                                      reference={verseReference}
                                      hoverDelayMs={500}
                                    >
                                      <button
                                        type="button"
                                        data-tour={tourAttr(variant, 'verse')}
                                        data-bible-picker-verse-number={n}
                                        onClick={() => onVerseClick(n)}
                                        className={`min-h-[48px] w-full min-w-0 cursor-pointer rounded-lg text-sm font-medium border transition-colors touch-manipulation ${
                                          on
                                            ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100 border-blue-300 dark:border-blue-600'
                                            : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'
                                        }`}
                                      >
                                        {n}
                                      </button>
                                    </ScriptureHoverModal>
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
            data-tour={confirmTourAttr(variant)}
            disabled={!canConfirm}
            onClick={() => void onConfirmClick()}
            className="w-full min-h-[48px] cursor-pointer rounded-lg font-medium border border-blue-300 dark:border-blue-600 bg-blue-100 text-blue-900 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-100 dark:hover:bg-blue-900/65 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? confirmPendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
