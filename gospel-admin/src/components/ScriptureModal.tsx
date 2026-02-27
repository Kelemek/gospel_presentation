'use client'

import { useState, useEffect, type TouchEvent } from 'react'
import { useTranslation } from '@/contexts/TranslationContext'



interface ScriptureModalProps {
  reference: string
  isOpen: boolean
  onClose: () => void
  onPrevious?: () => void
  onNext?: () => void
  hasPrevious?: boolean
  hasNext?: boolean
  currentIndex?: number
  totalFavorites?: number
  totalReferences?: number
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
  currentIndex = 0,
  totalFavorites = 0,
  totalReferences = 0,
  context,
  onScriptureViewed
}: ScriptureModalProps) {
  const { translation, setTranslation, enabledTranslations } = useTranslation()
  const [scriptureText, setScriptureText] = useState<string>('')
  const [chapterText, setChapterText] = useState<string>('')
  const [showingContext, setShowingContext] = useState(false)
  const [loading, setLoading] = useState(false)
  const [contextLoading, setContextLoading] = useState(false)
  const [error, setError] = useState<string>('')

  // Compare translation (second column)
  const [compareTranslation, setCompareTranslation] = useState<string | null>(null)
  const [compareText, setCompareText] = useState<string>('')
  const [compareChapterText, setCompareChapterText] = useState<string>('')
  const [compareLoading, setCompareLoading] = useState(false)
  const [compareError, setCompareError] = useState<string>('')

  const selectClassName = "w-[140px] px-6 py-2 text-base md:text-lg font-medium rounded-lg transition-colors min-h-[48px] border-2 bg-slate-100 text-slate-700 border-slate-400 hover:text-slate-800 hover:bg-slate-200 cursor-pointer appearance-none bg-no-repeat pr-10 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-size-[1.25rem] bg-position-[right_10px_center]"

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
      const response = await fetch(`/api/scripture?reference=${encodeURIComponent(chapterRef)}&translation=${translation}`)
      const data = await response.json()
      
      if (data.error) {
        setError(data.error)
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

  // Auto-scroll to highlighted verse when chapter context is displayed
  useEffect(() => {
    if (showingContext && chapterText) {
      setTimeout(() => {
        const verseNumbers = getVerseNumbers(reference)
        if (verseNumbers.length > 0) {
          // For verse ranges, use the range ID; for single verses, use verse-specific ID
          let elementId = ''
          if (verseNumbers.length > 1) {
            const lastVerse = verseNumbers[verseNumbers.length - 1]
            elementId = `verse-range-${verseNumbers[0]}-${lastVerse}`
          } else {
            elementId = `verse-${verseNumbers[0]}`
          }
          
          const highlightedElement = document.getElementById(elementId)
          if (highlightedElement) {
            highlightedElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            })
          }
        }
      }, 100)
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
      signal: abortController.signal
    })
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          setCompareError(data.error)
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
      signal: abortController.signal
    })
      .then(response => response.json())
      .then(data => {
        if (!data.error) {
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
        signal: abortController.signal
      })
        .then(response => response.json())
        .then(data => {
          if (data.error) {
            setError(data.error)
          } else {
            setScriptureText(data.text)
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

  if (!isOpen) return null

  const isComparing = !!compareTranslation

  const renderAttribution = (trans: string) => {
    if (trans === 'esv') {
      return (
        <>
          <p className="text-xs text-slate-500 text-center mb-1">
            Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission.
          </p>
          <p className="text-xs text-slate-500 text-center">
            <a href="https://www.esv.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
              www.esv.org
            </a>
          </p>
        </>
      )
    }
    if (trans === 'kjv') {
      return (
        <p className="text-xs text-slate-500 text-center">
          Scripture quotations are from the King James Version (KJV), which is in the public domain.
        </p>
      )
    }
    if (trans === 'nasb') {
      return (
        <p className="text-xs text-slate-500 text-center">
          Scripture quotations taken from the New American Standard Bible® (NASB), Copyright © 1960, 1962, 1963, 1968, 1971, 1972, 1973, 1975, 1977, 1995 by The Lockman Foundation. Used by permission.
        </p>
      )
    }
    if (trans === 'lsb') {
      return (
        <p className="text-xs text-slate-500 text-center">
          Legacy Standard Bible Copyright ©2021 by The Lockman Foundation. All rights reserved. Managed in partnership with Three Sixteen Publishing Inc.{' '}
          <a href="https://www.LSBible.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">LSBible.org</a>
          {' '}For Permission to Quote Information visit{' '}
          <a href="https://www.LSBible.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">www.LSBible.org</a>
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
    
    let processedText = text
      .replace(/\[(\d+)\]/g, '<sup class="text-blue-600 font-medium">$1</sup>')
      .replace(/\n\n/g, '</p><p class="mt-4">')
    
    if (isRange) {
      // For a range: Find and wrap everything from first verse to end of last verse
      const rangePattern = new RegExp(
        `(<sup[^>]*>${firstVerse}</sup>[\\s\\S]*?<sup[^>]*>${lastVerse}</sup>[^<]*?)(?=<sup[^>]*>\\d+</sup>|$)`,
        'g'
      )
      
      processedText = processedText.replace(
        rangePattern,
        `<div id="verse-range-${firstVerse}-${lastVerse}" class="bg-linear-to-br from-slate-50 to-slate-100 border-l-4 border-blue-500 px-4 py-3 my-4 rounded-r-md shadow-sm"><div class="font-semibold text-slate-900 text-base leading-relaxed">$1</div></div>`
      )
    } else {
      // Single verse - wrap it with Tailwind classes
      const verseNum = firstVerse
      processedText = processedText.replace(
        new RegExp(`(<sup[^>]*>${verseNum}</sup>[\\s\\S]*?)(?=<sup[^>]*>\\d+</sup>|$)`, 'g'),
        `<div id="verse-${verseNum}" class="bg-linear-to-br from-slate-50 to-slate-100 border-l-4 border-blue-500 px-4 py-3 my-4 rounded-r-md shadow-sm"><div class="font-semibold text-slate-900 text-base leading-relaxed">$1</div></div>`
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
    <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 z-50 flex items-start md:items-center justify-center p-0 md:p-4" style={{ minHeight: '100vh', minWidth: '100vw' }}>
      <div className="bg-white w-full md:max-w-2xl lg:max-w-4xl xl:max-w-5xl shadow-xl flex flex-col h-full md:h-[80vh] md:rounded-lg">
        
        {/* Fixed Header with Controls - Always Visible */}
        <div className="bg-slate-100 px-4 pt-safe-or-3 pb-3 border-b shrink-0 relative z-10 md:rounded-t-lg" style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}>
          {/* Navigation Controls - Always at Top */}
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-1 flex-1">
              <button
                onClick={() => {
                  if (hasPrevious && onPrevious) {
                    onPrevious()
                  }
                }}
                disabled={!hasPrevious}
                className={`min-h-[48px] min-w-[48px] p-2 rounded-lg transition-colors flex items-center justify-center text-xl font-bold ${
                  hasPrevious 
                    ? 'text-slate-600 hover:text-slate-800 hover:bg-slate-200 active:bg-slate-300' 
                    : 'text-slate-300 cursor-not-allowed'
                }`}
                title="Previous Scripture"
                aria-label="Previous Scripture"
              >
                ◀
              </button>
              <div className="text-center flex-1 px-2">
                <h3 className="text-lg md:text-xl font-semibold text-slate-800 leading-tight">{reference}</h3>
                {totalReferences > 0 && (
                  <span className="text-sm text-gray-600">
                    {currentIndex + 1} of {totalReferences} {totalFavorites > 0 ? 'favorites' : 'verses'}
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  if (hasNext && onNext) {
                    onNext()
                  }
                }}
                disabled={!hasNext}
                className={`min-h-[48px] min-w-[48px] p-2 rounded-lg transition-colors flex items-center justify-center text-xl font-bold ${
                  hasNext 
                    ? 'text-slate-600 hover:text-slate-800 hover:bg-slate-200 active:bg-slate-300' 
                    : 'text-slate-300 cursor-not-allowed'
                }`}
                title="Next Scripture"
                aria-label="Next Scripture"
              >
                ▶
              </button>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <button
                onClick={onClose}
                className="text-slate-500 hover:text-slate-700 text-2xl font-bold min-h-[48px] min-w-[48px] rounded-lg hover:bg-slate-200 active:bg-slate-300 flex items-center justify-center"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
          </div>
          
          {/* Context Toggle Buttons - Always Visible */}
          <div className="flex flex-wrap gap-2 justify-center">
            {/* Compare dropdown - to the left of main translation */}
            <select
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
              className={selectClassName}
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
              value={translation}
              onChange={async (e) => {
                await setTranslation(e.target.value as 'esv' | 'kjv' | 'nasb' | 'lsb')
                setChapterText('')
                setShowingContext(false)
              }}
              aria-label="Select Bible translation"
              className={selectClassName}
            >
              {enabledTranslations.map((trans) => (
                <option key={trans} value={trans}>
                  {trans.toUpperCase()}
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowingContext(false)}
              className={`px-4 py-2 text-base md:text-lg font-medium rounded-lg transition-colors min-h-[48px] border-2 ${
                !showingContext 
                  ? 'bg-blue-100 text-blue-700 border-blue-400' 
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100 border-slate-400'
              }`}
            >
              Verse
            </button>

            <button
              onClick={fetchChapterContext}
              disabled={contextLoading}
              className={`px-4 py-2 text-base md:text-lg font-medium rounded-lg transition-colors min-h-[48px] border-2 ${
                showingContext 
                  ? 'bg-blue-100 text-blue-700 border-blue-400' 
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100 border-slate-400'
              } ${contextLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {contextLoading ? 'Loading...' : 'Chapter Context'}
            </button>
          </div>
        </div>

        {/* Context Information - Only show when available */}
        {context && (
          <div className="px-4 py-3 bg-slate-50 border-b shrink-0">
            <div className="text-slate-700 text-base md:text-lg">
              <div className="flex items-center gap-2 mb-1">
                <strong className="text-slate-800">Section:</strong> 
                <span className="font-medium text-slate-600">{context.sectionTitle}</span>
              </div>
              <div className="flex items-center gap-2 mb-2 text-slate-600">
                <span className="font-medium">{context.subsectionTitle}</span>
              </div>
              <div className="prose prose-sm max-w-none text-slate-600 text-sm md:text-base leading-relaxed">
                <div dangerouslySetInnerHTML={{ __html: context.content }} />
              </div>
            </div>
          </div>
        )}
        {/* Scrollable Content Area */}
        <div 
          className={`flex-1 overflow-y-auto px-4 py-4 min-h-0 ${isComparing ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : ''}`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {isComparing ? (
            <>
              {/* Left column - Compare translation */}
              <div className="flex flex-col min-w-0">
                {compareLoading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-slate-600 text-base md:text-lg">Loading...</span>
                  </div>
                )}
                {showingContext && compareTranslation && !compareChapterText && !compareLoading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-slate-600 text-base md:text-lg">Loading chapter...</span>
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
                          className="text-slate-700 leading-relaxed text-lg md:text-xl"
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
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-slate-700 text-base md:text-lg">
                          <div className="flex items-center gap-2">
                            <strong className="text-slate-800">Chapter Context:</strong>
                            <span className="font-medium text-slate-600">{getChapterReference(reference)}</span>
                          </div>
                        </div>
                        <div
                          className="text-slate-700 leading-relaxed text-lg md:text-xl"
                          dangerouslySetInnerHTML={{
                            __html: processChapterText(compareChapterText)
                          }}
                        />
                      </div>
                    )}
                  </>
                )}
                {compareTranslation && !compareLoading && !compareError && (compareText || compareChapterText) && (
                  <div className="mt-4 pt-4 border-t border-slate-200 shrink-0">
                    {renderAttribution(compareTranslation)}
                  </div>
                )}
              </div>

              {/* Right column - Main translation */}
              <div className="flex flex-col min-w-0">
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
                      <div className="prose max-w-none">
                        <div
                          className="text-slate-700 leading-relaxed text-lg md:text-xl"
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
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-slate-700 text-base md:text-lg">
                          <div className="flex items-center gap-2">
                            <strong className="text-slate-800">Chapter Context:</strong>
                            <span className="font-medium text-slate-600">{getChapterReference(reference)}</span>
                          </div>
                        </div>
                        <div
                          id="chapter-content"
                          className="text-slate-700 leading-relaxed text-lg md:text-xl"
                          dangerouslySetInnerHTML={{
                            __html: processChapterText(chapterText)
                          }}
                        />
                      </div>
                    )}
                  </>
                )}
                {!loading && !contextLoading && !error && (scriptureText || chapterText) && (
                  <div className="mt-4 pt-4 border-t border-slate-200 shrink-0">
                    {renderAttribution(translation)}
                  </div>
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
              {!showingContext && scriptureText && (
                <div className="prose max-w-none">
                  <div
                    className="text-slate-700 leading-relaxed text-lg md:text-xl"
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
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-slate-700 text-base md:text-lg">
                    <div className="flex items-center gap-2">
                      <strong className="text-slate-800">Chapter Context:</strong>
                      <span className="font-medium text-slate-600">{getChapterReference(reference)}</span>
                    </div>
                  </div>
                  <div
                    id="chapter-content"
                    className="text-slate-700 leading-relaxed text-lg md:text-xl"
                    dangerouslySetInnerHTML={{
                      __html: processChapterText(chapterText)
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Fixed Footer - hidden when comparing (attributions are in-column) */}
        {!isComparing && (
        <div className="bg-slate-50 px-4 pt-2 border-t shrink-0 md:rounded-b-lg" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
          {translation === 'esv' ? (
            <>
              <p className="text-xs text-slate-500 text-center mb-1">
                Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission.
              </p>
              <p className="text-xs text-slate-500 text-center">
                <a href="https://www.esv.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
                  www.esv.org
                </a>
              </p>
            </>
          ) : translation === 'kjv' ? (
            <p className="text-xs text-slate-500 text-center">
              Scripture quotations are from the King James Version (KJV), which is in the public domain.
            </p>
          ) : translation === 'nasb' ? (
            <p className="text-xs text-slate-500 text-center">
              Scripture quotations taken from the New American Standard Bible® (NASB), Copyright © 1960, 1962, 1963, 1968, 1971, 1972, 1973, 1975, 1977, 1995 by The Lockman Foundation. Used by permission.
            </p>
          ) : translation === 'lsb' ? (
            <p className="text-xs text-slate-500 text-center">
              Legacy Standard Bible Copyright ©2021 by The Lockman Foundation. All rights reserved. Managed in partnership with Three Sixteen Publishing Inc.{' '}
              <a href="https://www.LSBible.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">LSBible.org</a>
              {' '}For Permission to Quote Information visit{' '}
              <a href="https://www.LSBible.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">www.LSBible.org</a>
            </p>
          ) : null}
        </div>
        )}
      </div>
    </div>
  )
}