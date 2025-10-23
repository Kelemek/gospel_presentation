'use client'

import { useState, useEffect } from 'react'

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
}

export default function ScriptureModal({ 
  reference, 
  isOpen, 
  onClose, 
  onPrevious, 
  onNext, 
  hasPrevious = false, 
  hasNext = false,
  context
}: ScriptureModalProps) {
  const [scriptureText, setScriptureText] = useState<string>('')
  const [chapterText, setChapterText] = useState<string>('')
  const [showingContext, setShowingContext] = useState(false)
  const [loading, setLoading] = useState(false)
  const [contextLoading, setContextLoading] = useState(false)
  const [error, setError] = useState<string>('')

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
    const match = verseRef.match(/:(\d+)(?:-(\d+))?/)
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
      const response = await fetch(`/api/scripture?reference=${encodeURIComponent(chapterRef)}`)
      const data = await response.json()
      
      if (data.error) {
        setError(data.error)
      } else {
        setChapterText(data.text)
        setShowingContext(true)
      }
    } catch (err) {
      setError('Failed to load chapter context')
    } finally {
      setContextLoading(false)
    }
  }

  // Auto-scroll to highlighted verse when chapter context is displayed
  useEffect(() => {
    if (showingContext && chapterText) {
      setTimeout(() => {
        const verseNumbers = getVerseNumbers(reference)
        if (verseNumbers.length > 0) {
          const firstVerseElement = document.getElementById(`verse-${verseNumbers[0]}`)
          if (firstVerseElement) {
            firstVerseElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            })
          }
        }
      }, 100)
    }
  }, [showingContext, chapterText, reference])

  useEffect(() => {
    if (isOpen && reference) {
      setLoading(true)
      setError('')
      setScriptureText('')
      setChapterText('')
      setShowingContext(false)

      fetch(`/api/scripture?reference=${encodeURIComponent(reference)}`)
        .then(response => response.json())
        .then(data => {
          if (data.error) {
            setError(data.error)
          } else {
            setScriptureText(data.text)
          }
        })
        .catch(err => {
          setError('Failed to load scripture text')
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [isOpen, reference])

  if (!isOpen) return null

  const processChapterText = (text: string): string => {
    const verseNumbers = getVerseNumbers(reference)
    let processedText = text
      .replace(/\[(\d+)\]/g, '<sup class="text-blue-600 font-medium">$1</sup>')
      .replace(/\n\n/g, '</p><p class="mt-4">')
    
    // Highlight target verses
    verseNumbers.forEach(verseNum => {
      const pattern = new RegExp(`(<sup[^>]*>${verseNum}</sup>.*?)(?=<sup[^>]*>\\d+</sup>|$)`, 'gs')
      
      processedText = processedText.replace(pattern, (match, verseContent) => {
        return `<div id="verse-${verseNum}" style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 16px 0; border-radius: 0 6px 6px 0; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);">
          <div style="font-weight: 600; color: #1e293b; font-size: 16px; line-height: 1.7; margin-bottom: 8px;">${verseContent}</div>
          <div style="font-size: 12px; color: #64748b; font-weight: 500; display: flex; align-items: center; gap: 4px;">
            <span style="color: #3b82f6;">📖</span> Your Reference: ${reference}
          </div>
        </div>`
      })
    })
    
    return processedText
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start md:items-center justify-center p-0 md:p-4 h-screen">
      <div className="bg-white w-full max-w-2xl shadow-xl flex flex-col h-screen md:h-auto md:max-h-[95vh] md:rounded-lg">
        
        {/* Fixed Header with Controls - Always Visible */}
        <div className="bg-slate-100 px-4 pt-safe-or-3 pb-3 border-b flex-shrink-0 relative z-10 md:rounded-t-lg" style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}>
          {/* Navigation Controls - Always at Top */}
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-1 flex-1">
              <button
                onClick={onPrevious}
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
              <h3 className="text-sm md:text-base font-semibold text-slate-800 text-center flex-1 px-2 leading-tight">{reference}</h3>
              <button
                onClick={onNext}
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
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700 text-2xl font-bold min-h-[48px] min-w-[48px] rounded-lg hover:bg-slate-200 active:bg-slate-300 flex items-center justify-center ml-2"
              aria-label="Close modal"
            >
              ×
            </button>
          </div>
          
          {/* Context Toggle Buttons - Always Visible */}
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setShowingContext(false)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors min-h-[44px] ${
                !showingContext 
                  ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              📖 Verse
            </button>
            <button
              onClick={fetchChapterContext}
              disabled={contextLoading}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors min-h-[44px] border ${
                showingContext 
                  ? 'bg-blue-100 text-blue-700 border-blue-300' 
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100 border-slate-200'
              } ${contextLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {contextLoading ? '⏳' : '📚'} Chapter Context
            </button>
          </div>
        </div>

        {/* Context Information - Only show when available */}
        {context && (
          <div className="px-4 py-3 bg-slate-50 border-b flex-shrink-0">
            <div className="text-slate-700 text-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-blue-600">📚</span>
                <strong className="text-slate-800">Section:</strong> 
                <span className="font-medium text-slate-600">{context.sectionTitle}</span>
              </div>
              <div className="flex items-center gap-2 mb-2 text-slate-600">
                <span className="text-blue-500">📖</span>
                <span className="font-medium">{context.subsectionTitle}</span>
              </div>
              <div className="text-slate-600 text-xs leading-relaxed">
                {context.content}
              </div>
            </div>
          </div>
        )}
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
          {(loading || contextLoading) && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-slate-600">
                {contextLoading ? 'Loading chapter context...' : 'Loading scripture...'}
              </span>
            </div>
          )}
          
          {error && (
            <div className="text-red-600 text-center py-8">
              <p className="mb-2">⚠️ {error}</p>
              <p className="text-sm text-slate-500">
                ESV API may be unavailable or reference format incorrect
              </p>
            </div>
          )}
          
          {/* Display verse text */}
          {!showingContext && scriptureText && (
            <div className="prose max-w-none">
              <div 
                className="text-slate-700 leading-relaxed text-base"
                dangerouslySetInnerHTML={{
                  __html: scriptureText
                    .replace(/\[(\d+)\]/g, '<sup class="text-blue-600 font-medium">$1</sup>')
                    .replace(/\n\n/g, '</p><p class="mt-4">')
                }}
              />
            </div>
          )}
          
          {/* Display chapter context with highlighted verse */}
          {showingContext && chapterText && (
            <div className="prose max-w-none">
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-slate-700 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-blue-600">📚</span>
                  <strong className="text-slate-800">Chapter Context:</strong> 
                  <span className="font-medium text-slate-600">{getChapterReference(reference)}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="text-blue-500">📖</span>
                  <span>Your reference ({reference}) is highlighted below</span>
                </div>
              </div>
              <div 
                id="chapter-content"
                className="text-slate-700 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: processChapterText(chapterText)
                }}
              />
            </div>
          )}
        </div>
        
        {/* Fixed Footer */}
        <div className="bg-slate-50 px-4 pt-2 border-t flex-shrink-0 md:rounded-b-lg" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
          <p className="text-xs text-slate-500 text-center">
            Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®)
          </p>
        </div>
      </div>
    </div>
  )
}