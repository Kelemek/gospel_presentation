'use client'

import { useId, useState, useEffect, useRef, type TouchEvent } from 'react'
import { useTranslation, type BibleTranslation } from '@/contexts/TranslationContext'
import { useAlertModal } from '@/contexts/AlertModalContext'
import { splitScriptureReferenceForHeader } from '@/lib/splitScriptureReferenceForHeader'
import { formatScriptureApiError } from '@/lib/format-scripture-api-error'
import {
  addMemorizedVerse,
  GOSPEL_MEMORIZATION_CHANGED_EVENT,
  isMemoizedForReference,
} from '@/lib/verseMemorizationStorage'



interface ScriptureModalProps {
  reference: string
  isOpen: boolean
  onClose: () => void
  onPrevious?: () => void
  onNext?: () => void
  hasPrevious?: boolean
  hasNext?: boolean
  context?: {
    sectionTitle: string
    subsectionTitle: string
    content: string
  }
  // Progress tracking props
  onScriptureViewed?: (reference: string) => void
}

export default function ScriptureModal({ 
  reference, 
  isOpen, 
  onClose, 
  onPrevious, 
  onNext, 
  hasPrevious = false, 
  hasNext = false,
  context,
  onScriptureViewed
}: ScriptureModalProps) {
  const { translation, setTranslation, enabledTranslations } = useTranslation()
  const { showAlert } = useAlertModal()
  const [scriptureText, setScriptureText] = useState<string>('')
  const [isMemoized, setIsMemoized] = useState(false)
  const [chapterText, setChapterText] = useState<string>('')
  const [showingContext, setShowingContext] = useState(false)
  const [loading, setLoading] = useState(false)
  const [contextLoading, setContextLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const scriptureModalTitleId = useId()

  // Compare translation (second column)
  const [compareTranslation, setCompareTranslation] = useState<string | null>(null)
  const [compareText, setCompareText] = useState<string>('')
  const [compareChapterText, setCompareChapterText] = useState<string>('')
  const [compareLoading, setCompareLoading] = useState(false)
  const [compareError, setCompareError] = useState<string>('')

  // min-w in rem so width scales with global text-size (html); fits "Compare" at Normal/Larger/Largest
  const selectClassNameCompact =
    "min-w-[7.5rem] w-auto max-w-[min(100%,14rem)] shrink-0 pl-2 pr-8 py-1.5 text-sm font-medium rounded-md transition-colors min-h-[2.25rem] border-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-400 dark:border-slate-600 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer appearance-none bg-no-repeat bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-size-[1rem] bg-position-[right_6px_center]"

  // Touch/swipe state for mobile navigation
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  
  // Minimum swipe distance (in px) to trigger navigation
  const minSwipeDistance = 50

  // Extract chapter reference from verse reference
  const getChapterReference = (verseRef: string): string => {
    const match = verseRef.match(/^(.+?)\s+(\d+)(?::\d+)?(?:-\d+)?/)
    if (match) {
      return `${match[1]} ${match[2]}`
    }
    return verseRef
  }

  // Extract verse numbers for highlighting
  const getVerseNumbers = (verseRef: string): number[] => {
    // Match both regular hyphen (-) and en-dash (–) for verse ranges
    const match = verseRef.match(/:(\d+)(?:[-–](\d+))?/)
    if (match) {
      const start = parseInt(match[1])
      const end = match[2] ? parseInt(match[2]) : start
      const verses = []
      for (let i = start; i <= end; i++) {
        verses.push(i)
      }
      return verses
    }
    return []
  }

  const fetchChapterContext = async () => {
    const chapterRef = getChapterReference(reference)
    setContextLoading(true)
    setError('')

    try {
      const response = await fetch(
        `/api/scripture?reference=${encodeURIComponent(chapterRef)}&translation=${translation}`,
        { cache: 'no-store' }
      )
      const data = await response.json()

      const errMsg = formatScriptureApiError(data)
      if (errMsg) {
        setError(errMsg)
      } else {
        setChapterText(data.text)
        setShowingContext(true)
      }
    } catch {
      setError('Failed to load chapter context')
    } finally {
      setContextLoading(false)
    }
  }

  useEffect(() => {
    setIsMemoized(isMemoizedForReference(reference, translation))
  }, [reference, translation])

  useEffect(() => {
    const onChanged = () => setIsMemoized(isMemoizedForReference(reference, translation))
    window.addEventListener(GOSPEL_MEMORIZATION_CHANGED_EVENT, onChanged)
    return () => window.removeEventListener(GOSPEL_MEMORIZATION_CHANGED_EVENT, onChanged)
  }, [reference, translation])

  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
      document.documentElement.style.overflow = 'unset'
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset'
      document.documentElement.style.overflow = 'unset'
    }
  }, [isOpen])

  // Auto-scroll to highlighted verse when chapter context is displayed (scroll the modal pane, not the window)
  useEffect(() => {
    if (!showingContext || !chapterText) return

    const reduceMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const behavior: ScrollBehavior = reduceMotion ? 'auto' : 'smooth'

    const scrollPane = scrollAreaRef.current
    const verseNumbers = getVerseNumbers(reference)
    if (verseNumbers.length === 0) return

    let elementId = ''
    if (verseNumbers.length > 1) {
      const lastVerse = verseNumbers[verseNumbers.length - 1]
      elementId = `verse-range-${verseNumbers[0]}-${lastVerse}`
    } else {
      elementId = `verse-${verseNumbers[0]}`
    }

    const scrollHighlightedIntoPane = (): void => {
      const pane = scrollAreaRef.current
      const highlightedElement = document.getElementById(elementId)
      if (!pane || !highlightedElement) return
      const paneRect = pane.getBoundingClientRect()
      const verseRect = highlightedElement.getBoundingClientRect()
      const delta =
        verseRect.top - paneRect.top - paneRect.height / 2 + verseRect.height / 2
      pane.scrollBy({ top: delta, behavior })
    }

    let cancelled = false
    const run = (): void => {
      if (!cancelled) scrollHighlightedIntoPane()
    }

    const t0 = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(run)
    })
    const t1 = window.setTimeout(run, 120)
    const t2 = window.setTimeout(run, 400)

    return () => {
      cancelled = true
      window.cancelAnimationFrame(t0)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [showingContext, chapterText, reference])

  // Clear chapter context when translation changes
  useEffect(() => {
    if (translation) {
      setChapterText('')
      setShowingContext(false)
    }
  }, [translation])

  // Clear compare when main translation matches compare
  useEffect(() => {
    if (compareTranslation && compareTranslation === translation) {
      setCompareTranslation(null)
      setCompareText('')
      setCompareChapterText('')
    }
  }, [translation, compareTranslation])

  // Fetch compare content when compareTranslation is set
  useEffect(() => {
    if (!isOpen || !reference || !compareTranslation) {
      setCompareText('')
      setCompareChapterText('')
      setCompareError('')
      return
    }

    const abortController = new AbortController()

    // Fetch verse for compare
    setCompareLoading(true)
    setCompareError('')
    fetch(`/api/scripture?reference=${encodeURIComponent(reference)}&translation=${compareTranslation}`, {
      signal: abortController.signal,
      cache: 'no-store',
    })
      .then(response => response.json())
      .then(data => {
        const errMsg = formatScriptureApiError(data)
        if (errMsg) {
          setCompareError(errMsg)
        } else {
          setCompareText(data.text)
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setCompareError('Failed to load compare text')
        }
      })
      .finally(() => setCompareLoading(false))

    return () => abortController.abort()
  }, [isOpen, reference, compareTranslation])

  // Fetch compare chapter context when showingContext and compareTranslation
  useEffect(() => {
    if (!isOpen || !reference || !compareTranslation || !showingContext) {
      setCompareChapterText('')
      return
    }

    const abortController = new AbortController()
    const chapterRef = getChapterReference(reference)

    fetch(`/api/scripture?reference=${encodeURIComponent(chapterRef)}&translation=${compareTranslation}`, {
      signal: abortController.signal,
      cache: 'no-store',
    })
      .then(response => response.json())
      .then(data => {
        if (!formatScriptureApiError(data)) {
          setCompareChapterText(data.text)
        }
      })
      .catch(() => {})

    return () => abortController.abort()
  }, [isOpen, reference, compareTranslation, showingContext])

  // Fetch scripture when modal opens, reference changes, or translation changes
  useEffect(() => {
    if (isOpen && reference) {
      const abortController = new AbortController()
      setLoading(true)
      setError('')
      setChapterText('')
      setShowingContext(false)

      fetch(`/api/scripture?reference=${encodeURIComponent(reference)}&translation=${translation}`, {
        signal: abortController.signal,
        cache: 'no-store',
      })
        .then(response => response.json())
        .then(data => {
          const errMsg = formatScriptureApiError(data)
          if (errMsg) {
            setError(errMsg)
          } else {
            setScriptureText(typeof data.text === 'string' ? data.text : '')
            // Track scripture progress when successfully viewed in modal
            if (onScriptureViewed) {
              onScriptureViewed(reference)
            }
          }
        })
        .catch((err) => {
          // Don't set error if the request was aborted
          if (err.name !== 'AbortError') {
            setError('Failed to load scripture text')
          }
        })
        .finally(() => {
          setLoading(false)
        })

      return () => {
        abortController.abort()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, reference, translation])

  const handleMemorize = () => {
    const text = scriptureText ?? ''
    if (!text.trim() || loading || error) return
    const ok = addMemorizedVerse(reference, text, translation)
    if (ok) {
      setIsMemoized(true)
      showAlert(
        'Added to memorization list.\n\nYou can find this verse under Memorize in the menu.'
      )
    } else {
      showAlert('This verse is already in your memorization list.')
    }
  }

  if (!isOpen) return null

  const { book: headerBook, referenceSuffix: headerSuffix } =
    splitScriptureReferenceForHeader(reference)

  const isComparing = !!compareTranslation

  const renderAttribution = (trans: string) => {
    if (trans === 'esv') {
      return (
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission.{' '}
          <a href="https://www.esv.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline">
            www.esv.org
          </a>
        </p>
      )
    }
    if (trans === 'kjv') {
      return (
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          Scripture quotations are from the King James Version (KJV), which is in the public domain.
        </p>
      )
    }
    if (trans === 'nasb') {
      return (
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          Scripture quotations taken from the New American Standard Bible® (NASB), Copyright © 1960, 1962, 1963, 1968, 1971, 1972, 1973, 1975, 1977, 1995 by The Lockman Foundation. Used by permission.{' '}
          <a href="https://www.lockman.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline">
            www.lockman.org
          </a>
        </p>
      )
    }
    if (trans === 'lsb') {
      return (
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          Legacy Standard Bible Copyright ©2021 by The Lockman Foundation. All rights reserved. Managed in partnership with Three Sixteen Publishing Inc.{' '}
          <a href="https://www.LSBible.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline">LSBible.org</a>
          {' '}For Permission to Quote Information visit{' '}
          <a href="https://www.LSBible.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline">www.LSBible.org</a>
        </p>
      )
    }
    if (trans === 'niv') {
      return (
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          Scripture quotations taken from THE HOLY BIBLE, NEW INTERNATIONAL VERSION®, NIV® Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.® Used by permission.{' '}
          <a href="https://www.biblica.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline">
            Biblica.com
          </a>
        </p>
      )
    }
    if (trans === 'nlt') {
      return (
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          Scripture quotations marked NLT are taken from the Holy Bible, New Living Translation, copyright © 1996, 2004, 2015 by Tyndale House Foundation. Used by permission of Tyndale House Publishers, Inc.{' '}
          <a href="https://www.tyndale.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline">
            Tyndale.com
          </a>
        </p>
      )
    }
    if (trans === 'csb') {
      return (
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          Scripture quotations taken from the Christian Standard Bible®, Copyright © 2017 by Holman Bible Publishers. Used by permission.{' '}
          <a href="https://csbible.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline">
            CSBible.com
          </a>
        </p>
      )
    }
    return null
  }

  const processChapterText = (text: string): string => {
    const verseNumbers = getVerseNumbers(reference)
    
    if (verseNumbers.length === 0) {
      // No verses to highlight, just format the text
      return text
        .replace(/\[(\d+)\]/g, '<sup class="text-blue-600 font-medium">$1</sup>')
        .replace(/\n\n/g, '</p><p class="mt-4">')
    }
    
    const firstVerse = verseNumbers[0]
    const lastVerse = verseNumbers[verseNumbers.length - 1]
    const isRange = verseNumbers.length > 1
    /** Next verse after the selection; footnotes use `[1]` etc. and must not end the highlight early. */
    const nextVerseAfterSelection = lastVerse + 1

    let processedText = text
      .replace(/\[(\d+)\]/g, '<sup class="text-blue-600 font-medium">$1</sup>')
      .replace(/\n\n/g, '</p><p class="mt-4">')
    
    if (isRange) {
      // For a range: Find and wrap everything from first verse to end of last verse
      const rangePattern = new RegExp(
        `(<sup[^>]*>${firstVerse}</sup>[\\s\\S]*?<sup[^>]*>${lastVerse}</sup>[^<]*?)(?=<sup[^>]*>${nextVerseAfterSelection}</sup>|$)`,
        'g'
      )
      
      processedText = processedText.replace(
        rangePattern,
        `<div id="verse-range-${firstVerse}-${lastVerse}" class="bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 border-l-4 border-blue-500 dark:border-blue-400 px-4 py-3 my-4 rounded-r-md shadow-sm"><div class="font-semibold text-slate-900 dark:text-slate-100 text-base leading-relaxed">$1</div></div>`
      )
    } else {
      // Single verse - wrap it with Tailwind classes
      const verseNum = firstVerse
      processedText = processedText.replace(
        new RegExp(
          `(<sup[^>]*>${verseNum}</sup>[\\s\\S]*?)(?=<sup[^>]*>${nextVerseAfterSelection}</sup>|$)`,
          'g'
        ),
        `<div id="verse-${verseNum}" class="bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 border-l-4 border-blue-500 dark:border-blue-400 px-4 py-3 my-4 rounded-r-md shadow-sm"><div class="font-semibold text-slate-900 dark:text-slate-100 text-base leading-relaxed">$1</div></div>`
      )
    }
    
    return processedText
  }

  // Touch event handlers for mobile swiping
  const handleTouchStart = (e: TouchEvent) => {
    setTouchEnd(null) // Reset touchEnd when a new touch starts
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe && hasNext && onNext) {
      onNext()
    } else if (isRightSwipe && hasPrevious && onPrevious) {
      onPrevious()
    }
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 z-50 flex items-start lg:items-center justify-center p-0 lg:p-4"
      style={{
        minHeight: '100vh',
        minWidth: '100vw',
        paddingTop: 'env(safe-area-inset-top)',
        paddingRight: 'env(safe-area-inset-right)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
      }}
    >
      <div
        className="bg-white dark:bg-slate-800 w-full lg:max-w-2xl xl:max-w-4xl 2xl:max-w-5xl shadow-xl flex flex-col h-full lg:h-[80vh] lg:rounded-lg min-h-0"
        role="dialog"
        aria-modal="true"
        aria-labelledby={scriptureModalTitleId}
      >
        
        {/* Fixed Header with Controls - Always Visible */}
        {/* Top safe area is on the full-screen overlay only; do not repeat here (doubles inset in Capacitor/iOS). */}
        <div
          className="bg-slate-100 dark:bg-slate-700 px-4 pt-2 pb-2 border-b dark:border-slate-600 shrink-0 relative z-10 lg:rounded-t-lg"
          data-tour="scripture-modal-toolbar"
        >
          {/* Navigation Controls - Always at Top */}
          <div className="flex justify-between items-center mb-2">
            <div className="flex-1 min-w-0" aria-hidden />
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                data-tour="scripture-modal-prev"
                onClick={() => {
                  if (hasPrevious && onPrevious) {
                    onPrevious()
                  }
                }}
                disabled={!hasPrevious}
                className={`min-h-[36px] min-w-[36px] p-1.5 rounded-md transition-colors flex items-center justify-center text-lg font-bold ${
                  hasPrevious 
                    ? 'cursor-pointer text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600 active:bg-slate-300 dark:active:bg-slate-500' 
                    : 'text-slate-300 dark:text-slate-500 cursor-not-allowed'
                }`}
                title="Previous Scripture"
                aria-label="Previous Scripture"
              >
                ◀
              </button>
              <h3
                id={scriptureModalTitleId}
                className="text-base md:text-lg font-semibold text-slate-800 dark:text-slate-100 leading-tight px-1 min-w-0 max-w-[50vw] flex items-baseline gap-1 min-h-0"
                title={reference}
                aria-label={reference}
              >
                {!headerSuffix ? (
                  <span className="min-w-0 truncate">{headerBook}</span>
                ) : (
                  <>
                    <span className="min-w-0 truncate">{headerBook}</span>
                    <span className="shrink-0 whitespace-nowrap">{headerSuffix}</span>
                  </>
                )}
              </h3>
              <button
                type="button"
                data-tour="scripture-modal-next"
                onClick={() => {
                  if (hasNext && onNext) {
                    onNext()
                  }
                }}
                disabled={!hasNext}
                className={`min-h-[36px] min-w-[36px] p-1.5 rounded-md transition-colors flex items-center justify-center text-lg font-bold ${
                  hasNext 
                    ? 'cursor-pointer text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600 active:bg-slate-300 dark:active:bg-slate-500' 
                    : 'text-slate-300 dark:text-slate-500 cursor-not-allowed'
                }`}
                title="Next Scripture"
                aria-label="Next Scripture"
              >
                ▶
              </button>
            </div>
            <div className="flex-1 flex justify-end items-center gap-1.5">
              <button
                type="button"
                data-tour="scripture-modal-close"
                onClick={onClose}
                className="cursor-pointer text-slate-600 dark:text-slate-200 text-xl font-bold min-h-[36px] min-w-[36px] rounded-md flex items-center justify-center bg-white dark:bg-slate-600 shadow-sm ring-1 ring-slate-300/80 dark:ring-slate-500/60 hover:bg-slate-50 dark:hover:bg-slate-500 hover:ring-slate-400 dark:hover:ring-slate-400 active:bg-slate-100 dark:active:bg-slate-400"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
          </div>
          
          {/* Context Toggle Buttons - Always Visible. Small: row1 = selects, row2 = Verse + Chapter Context + Memorize */}
          <div className="flex flex-wrap gap-1.5 justify-center items-center">
            <div className="w-full sm:w-auto flex flex-wrap gap-1.5 justify-center sm:justify-start items-center">
              {/* Compare dropdown - to the left of main translation */}
              <select
                data-tour="scripture-modal-compare"
                value={compareTranslation ?? ''}
                onChange={(e) => {
                  const val = e.target.value
                  setCompareTranslation(val === '' ? null : val)
                  if (!val) {
                    setCompareText('')
                    setCompareChapterText('')
                    setCompareError('')
                  }
                }}
                aria-label="Compare with another translation"
                className={selectClassNameCompact}
              >
                <option value="">Compare</option>
                {enabledTranslations
                  .filter((trans) => trans !== translation)
                  .map((trans) => (
                    <option key={trans} value={trans}>
                      {trans.toUpperCase()}
                    </option>
                  ))}
              </select>

              {/* Translation Selector */}
              <select
                data-tour="scripture-modal-translation"
                value={translation}
                onChange={async (e) => {
                  await setTranslation(e.target.value as BibleTranslation)
                  setChapterText('')
                  setShowingContext(false)
                }}
                aria-label="Select Bible translation"
                className={selectClassNameCompact}
              >
                {enabledTranslations.map((trans) => (
                  <option key={trans} value={trans}>
                    {trans.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full sm:w-auto flex flex-wrap gap-1.5 justify-center sm:justify-start items-center">
              <button
                type="button"
                data-tour="scripture-modal-verse-tab"
                onClick={() => setShowingContext(false)}
                className={`cursor-pointer px-3 py-1.5 text-sm font-medium rounded-md transition-colors min-h-[36px] border-2 ${
                  !showingContext 
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200 border-blue-400 dark:border-blue-600' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600 border-slate-400 dark:border-slate-500'
                }`}
              >
                Verse
              </button>

              <button
                type="button"
                data-tour="scripture-modal-chapter-context"
                onClick={fetchChapterContext}
                disabled={contextLoading}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors min-h-[36px] border-2 ${
                  showingContext 
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200 border-blue-400 dark:border-blue-600' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600 border-slate-400 dark:border-slate-500'
                } ${contextLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {contextLoading ? 'Loading...' : 'Chapter Context'}
              </button>

              <button
                type="button"
                data-tour="scripture-modal-memorize"
                onClick={handleMemorize}
                disabled={loading || !!error || !(scriptureText ?? '').trim() || isMemoized}
                title={isMemoized ? 'Already in memorization list' : 'Save this verse to memorize later'}
                aria-label={isMemoized ? 'Verse already in memorization list' : 'Memorize this verse'}
                className={`px-2 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors min-h-[36px] border-2 shrink-0 ${
                  isMemoized || loading || !!error || !(scriptureText ?? '').trim()
                    ? 'text-slate-400 dark:text-slate-500 border-slate-300 dark:border-slate-600 cursor-not-allowed bg-slate-50 dark:bg-slate-700/50'
                    : 'cursor-pointer text-slate-700 dark:text-slate-200 border-slate-400 dark:border-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 active:bg-slate-300 dark:active:bg-slate-500'
                }`}
              >
                Memorize
              </button>
            </div>
          </div>
        </div>

        {/* Context Information - Only show when available */}
        {context && (
          <div
            className="px-4 py-2 bg-slate-50 dark:bg-slate-700/50 border-b dark:border-slate-600 shrink-0"
            data-tour="scripture-modal-context"
          >
            <div className="text-slate-700 dark:text-slate-200 text-base md:text-lg">
              <div className="flex items-center gap-2 mb-1">
                <strong className="text-slate-800 dark:text-slate-100">Section:</strong> 
                <span className="font-medium text-slate-600 dark:text-slate-300">{context.sectionTitle}</span>
              </div>
              <div className="flex items-center gap-2 mb-2 text-slate-600 dark:text-slate-300">
                <span className="font-medium">{context.subsectionTitle}</span>
              </div>
              <div className="prose prose-sm max-w-none text-slate-600 dark:text-slate-300 text-sm md:text-base leading-relaxed">
                <div dangerouslySetInnerHTML={{ __html: context.content }} />
              </div>
            </div>
          </div>
        )}
        {/* Scrollable Content Area — data-tour scroll-area when single column so driver.js can spotlight this pane (pointer-events); compare mode uses compare-columns */}
        <div 
          ref={scrollAreaRef}
          className={`flex-1 overflow-y-auto px-4 py-4 min-h-0 ${isComparing ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : ''}`}
          data-tour={isComparing ? 'scripture-modal-compare-columns' : 'scripture-modal-scroll-area'}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {isComparing ? (
            <>
              {/* Left column - Compare translation */}
              <div className="flex flex-col min-w-0">
                {compareTranslation && (
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-2">{compareTranslation}</span>
                )}
                {compareLoading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-slate-600 dark:text-slate-300 text-base md:text-lg">Loading...</span>
                  </div>
                )}
                {showingContext && compareTranslation && !compareChapterText && !compareLoading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-slate-600 dark:text-slate-300 text-base md:text-lg">Loading chapter...</span>
                  </div>
                )}
                {compareError && (
                  <div className="text-red-600 text-center py-8">
                    <p className="mb-2 text-base md:text-lg">⚠️ {compareError}</p>
                  </div>
                )}
                {!compareLoading && !compareError && (
                  <>
                    {!showingContext && compareText && (
                      <div className="prose max-w-none">
                        <div 
                          className="text-slate-700 dark:text-slate-200 leading-relaxed text-lg md:text-xl"
                          dangerouslySetInnerHTML={{
                            __html: compareText
                              .replace(/\[(\d+)\]/g, '<sup class="text-blue-600 font-medium">$1</sup>')
                              .replace(/\n\n/g, '</p><p class="mt-4">')
                          }}
                        />
                      </div>
                    )}
                    {showingContext && compareChapterText && (
                      <div className="prose max-w-none">
                        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg text-slate-700 dark:text-slate-200 text-base md:text-lg">
                          <div className="flex items-center gap-2">
                            <strong className="text-slate-800 dark:text-slate-100">Chapter Context:</strong>
                            <span className="font-medium text-slate-600 dark:text-slate-200">{getChapterReference(reference)}</span>
                          </div>
                        </div>
                        <div
                          className="text-slate-700 dark:text-slate-200 leading-relaxed text-lg md:text-xl"
                          dangerouslySetInnerHTML={{
                            __html: processChapterText(compareChapterText)
                          }}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Right column - Main translation */}
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-2">{translation}</span>
                {(loading || contextLoading) && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-slate-600 text-base md:text-lg">
                      {contextLoading ? 'Loading chapter...' : 'Loading...'}
                    </span>
                  </div>
                )}
                {error && (
                  <div className="text-red-600 text-center py-8">
                    <p className="mb-2 text-base md:text-lg">⚠️ {error}</p>
                    <p className="text-sm md:text-base text-slate-500">
                      ESV API may be unavailable or reference format incorrect
                    </p>
                  </div>
                )}
                {!loading && !contextLoading && !error && (
                  <>
                    {!showingContext && scriptureText && (
                      <div className="prose max-w-none" data-tour="scripture-modal-verse-body">
                        <div
                          className="text-slate-700 dark:text-slate-200 leading-relaxed text-lg md:text-xl"
                          dangerouslySetInnerHTML={{
                            __html: scriptureText
                              .replace(/\[(\d+)\]/g, '<sup class="text-blue-600 font-medium">$1</sup>')
                              .replace(/\n\n/g, '</p><p class="mt-4">')
                          }}
                        />
                      </div>
                    )}
                    {showingContext && chapterText && (
                      <div className="prose max-w-none">
                        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg text-slate-700 dark:text-slate-200 text-base md:text-lg">
                          <div className="flex items-center gap-2">
                            <strong className="text-slate-800 dark:text-slate-100">Chapter Context:</strong>
                            <span className="font-medium text-slate-600 dark:text-slate-200">{getChapterReference(reference)}</span>
                          </div>
                        </div>
                        <div
                          id="chapter-content"
                          data-tour="scripture-modal-chapter-body"
                          className="text-slate-700 dark:text-slate-200 leading-relaxed text-lg md:text-xl"
                          dangerouslySetInnerHTML={{
                            __html: processChapterText(chapterText)
                          }}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              {(loading || contextLoading) && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-slate-600 text-base md:text-lg">
                    {contextLoading ? 'Loading chapter context...' : 'Loading scripture...'}
                  </span>
                </div>
              )}
              {error && (
                <div className="text-red-600 text-center py-8">
                  <p className="mb-2 text-base md:text-lg">⚠️ {error}</p>
                  <p className="text-sm md:text-base text-slate-500">
                    ESV API may be unavailable or reference format incorrect
                  </p>
                </div>
              )}
              {!loading && !contextLoading && !error && (
                <>
                  {!showingContext && scriptureText && (
                    <div className="prose max-w-none" data-tour="scripture-modal-verse-body">
                      <div
                        className="text-slate-700 dark:text-slate-200 leading-relaxed text-lg md:text-xl"
                        dangerouslySetInnerHTML={{
                          __html: scriptureText
                            .replace(/\[(\d+)\]/g, '<sup class="text-blue-600 font-medium">$1</sup>')
                            .replace(/\n\n/g, '</p><p class="mt-4">')
                        }}
                      />
                    </div>
                  )}
                  {showingContext && chapterText && (
                    <div className="prose max-w-none">
                      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg text-slate-700 dark:text-slate-200 text-base md:text-lg">
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-800 dark:text-slate-100">Chapter Context:</strong>
                          <span className="font-medium text-slate-600 dark:text-slate-200">{getChapterReference(reference)}</span>
                        </div>
                      </div>
                      <div
                        id="chapter-content"
                        data-tour="scripture-modal-chapter-body"
                        className="text-slate-700 dark:text-slate-200 leading-relaxed text-lg md:text-xl"
                        dangerouslySetInnerHTML={{
                          __html: processChapterText(chapterText)
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </>
          )}
          {/* Attribution - inside scrollable area; same bg as section block (bg-slate-50 dark:bg-slate-700/50) */}
          <div className="scripture-modal-attribution space-y-2 bg-slate-50 dark:bg-slate-700/50 px-4 py-3 mt-4 border-y border-slate-200 dark:border-slate-600 md:col-span-2">
            {renderAttribution(translation)}
            {compareTranslation && renderAttribution(compareTranslation)}
          </div>
        </div>
      </div>
    </div>
  )
}