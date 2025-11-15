'use client'

import { GospelSection as GospelSectionType, Subsection, NestedSubsection, ScriptureReference, QuestionAnswer, PROFILE_VALIDATION, SavedAnswer } from '@/lib/types'
import ScriptureHoverModal from './ScriptureHoverModal'
import ComaModal from './ComaModal'
import React, { useState, useEffect } from 'react'


// Helper component to render text with COMA buttons and inline scripture references
// Helper component to render text with COMA buttons and inline scripture references
function TextWithComaButtons({ text, onComaClick, onScriptureClick }: { 
  text: string; 
  onComaClick: () => void;
  onScriptureClick?: (reference: string) => void;
}) {
  const containerRef = React.useRef<HTMLSpanElement>(null)
  
// Helper function to strip HTML tags for pattern matching
  const stripHtmlTags = (html: string): string => {
    // Always use regex fallback to avoid SSR issues with document
    return html.replace(/<[^>]*>/g, '')
  }
  
  // Bible book names lookup table - covers all 66 canonical books with common variations
  const BIBLE_BOOKS = new Set([
    // Old Testament - Pentateuch
    'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
    // Old Testament - Historical
    'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings',
    '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther',
    // Old Testament - Wisdom/Poetry
    'Job', 'Psalms', 'Psalm', 'Proverbs', 'Ecclesiastes', 'Song of Songs', 'Song of Solomon',
    // Old Testament - Major Prophets
    'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel',
    // Old Testament - Minor Prophets
    'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
    'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
    // New Testament - Gospels
    'Matthew', 'Mark', 'Luke', 'John',
    // New Testament - Acts and Paul's epistles
    'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
    'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy',
    '2 Timothy', 'Titus', 'Philemon',
    // New Testament - Hebrews and James
    'Hebrews', 'James',
    // New Testament - Peter, John, Jude
    '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude',
    // New Testament - Revelation
    'Revelation', 'Apocalypse'
  ])
  
  // Improved scripture reference pattern - matches book name (with optional number prefix) followed by chapter:verse
  // Improved scripture reference pattern - matches book name followed by chapter:verse with optional ranges
  // Handles: "John 3:16", "1 Corinthians 7:3-4", "Song of Solomon 7:10-12", "Psalm 23:1,3,5"
  // Allows HTML tags between words for rich text content
  const wordPattern = '[A-Z][a-z]+'
  const spaceWithOptionalTags = '(?:<[^>]*>)*\\s+(?:<[^>]*>)*'
  const scripturePattern = new RegExp(
    `\\b((?:\\d${spaceWithOptionalTags})?${wordPattern}(?:${spaceWithOptionalTags}(?:of|and|the)${spaceWithOptionalTags}${wordPattern})*)` +
    `${spaceWithOptionalTags}(\\d+)(?:<[^>]*>)*:(</[^>]*>)*(?:<[^>]*>)*(\\d+)(?:-\\d+)?(?:,\\s*\\d+(?::\\d+)?)*\\b`,
    'g'
  )
  
  // First, handle COMA markers
  const comaMarker = '___COMA_BUTTON___'
  let processedText = text.replace(/(C\.O\.M\.A\.|COMA)/gi, comaMarker)
  const comaMatches = text.match(/(C\.O\.M\.A\.|COMA)/gi) || []
  
  // Then, handle scripture references - match directly in the HTML text
  const scriptureMarker = '___SCRIPTURE_REF___'
  const scriptureMatches: string[] = []
  const cleanReferences: string[] = []  // Store clean references without HTML tags
  
  // Find all verse references in the text (with HTML tags)
  let match
  while ((match = scripturePattern.exec(processedText)) !== null) {
    const fullMatch = match[0]
    // Strip HTML tags from the book name for validation
    const bookNameWithTags = match[1]
    const bookName = bookNameWithTags.replace(/<[^>]*>/g, '').trim()
    
    // Only add if it's a valid book name from our lookup table
    if (BIBLE_BOOKS.has(bookName)) {
      scriptureMatches.push(fullMatch)
      // Store the clean reference (without HTML tags) for display
      const cleanRef = fullMatch.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
      cleanReferences.push(cleanRef)
      // Replace this match with a marker
      processedText = processedText.substring(0, match.index) + scriptureMarker + processedText.substring(match.index + fullMatch.length)
      // Reset regex lastIndex since we modified the string
      scripturePattern.lastIndex = match.index + scriptureMarker.length
    }
  }
  
  // Split by both markers and reconstruct
  const parts = processedText.split(new RegExp(`(${comaMarker}|${scriptureMarker})`))
  
  // Build everything as HTML string for true inline flow
  let htmlString = ''
  let comaIndex = 0
  let scriptureIndex = 0
  
  parts.forEach((part) => {
    if (part === comaMarker && comaMatches[comaIndex]) {
      // Add COMA button as HTML - match scripture styling exactly
      const comaText = comaMatches[comaIndex]
      htmlString += `<a href="#" data-coma="true" class="px-1.5 py-0.5 font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors cursor-pointer whitespace-nowrap no-underline" style="display: inline; margin: 0 2px; vertical-align: baseline; font-size: inherit;" title="Learn about the C.O.M.A. method">${comaText}</a>`
      comaIndex++
    } else if (part === scriptureMarker && scriptureIndex < cleanReferences.length) {
      // Add inline scripture reference as HTML string using clean reference
      const reference = cleanReferences[scriptureIndex]
      if (onScriptureClick) {
        htmlString += `<a href="#" data-scripture="${reference}" class="px-1.5 py-0.5 font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors cursor-pointer whitespace-nowrap no-underline" style="display: inline; margin: 0 2px; vertical-align: baseline; font-size: inherit;" title="Click to view ${reference}">${reference}</a>`
      } else {
        htmlString += `<span class="px-1.5 py-0.5 font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded whitespace-nowrap" style="display: inline; margin: 0 2px; vertical-align: baseline; font-size: inherit;">${reference}</span>`
      }
      scriptureIndex++
    } else if (part) {
      // Add the HTML part
      htmlString += part
    }
  })
  
  // Add click handlers for both COMA and scripture links - scoped to this component's container
  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      
      // Handle COMA clicks - only if it's an anchor with data-coma
      if (target.tagName === 'A' && target.hasAttribute('data-coma')) {
        e.preventDefault()
        e.stopPropagation()
        onComaClick()
        return
      }
      
      // Handle scripture clicks - only if it's an anchor with data-scripture
      if (target.tagName === 'A' && target.hasAttribute('data-scripture')) {
        e.preventDefault()
        e.stopPropagation()
        const reference = target.getAttribute('data-scripture')
        if (reference && onScriptureClick) {
          onScriptureClick(reference)
        }
        return
      }
    }
    
    container.addEventListener('click', handleClick)
    return () => container.removeEventListener('click', handleClick)
  }, [onComaClick, onScriptureClick])
  
  return <span ref={containerRef} dangerouslySetInnerHTML={{ __html: htmlString }} />

}

interface GospelSectionProps {
  section: GospelSectionType
  onScriptureClick: (reference: string) => void
  lastViewedScripture?: string  // Reference of the last viewed scripture
  onClearProgress?: () => void  // Function to clear progress when pin is clicked
  profileSlug: string
  savedAnswers?: SavedAnswer[]
}

interface ScriptureReferencesProps {
  references: ScriptureReference[]
  onScriptureClick: (reference: string) => void
  lastViewedScripture?: string
  onClearProgress?: () => void
}

interface SubsectionProps {
  subsection: Subsection
  sectionId: string
  subsectionIndex: number
  onScriptureClick: (reference: string) => void
  lastViewedScripture?: string
  onClearProgress?: () => void
  profileSlug: string
  savedAnswers?: SavedAnswer[]
}

interface NestedSubsectionProps {
  nestedSubsection: NestedSubsection
  onScriptureClick: (reference: string) => void
  lastViewedScripture?: string
  onClearProgress?: () => void
  profileSlug: string
  savedAnswers?: SavedAnswer[]
}

function ScriptureReferences({ references, onScriptureClick, lastViewedScripture, onClearProgress }: ScriptureReferencesProps) {
  if (!references || references.length === 0) return null

  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent the button click from firing
    e.preventDefault() // Prevent any default behavior
    if (onClearProgress) {
      onClearProgress()
    }
  }

  return (
    <div className="mt-3 print-scripture">
      <div className="flex flex-wrap gap-2">
        {references.map((ref, index) => {
          const isLastViewed = lastViewedScripture === ref.reference
          
          return (
            <div key={index} className="relative inline-block">
              <ScriptureHoverModal
                reference={ref.reference}
                hoverDelayMs={2000} // 2 seconds
              >
                <button
                  onClick={() => onScriptureClick(ref.reference)}
                  className={`inline-block px-4 py-2 text-base md:text-lg rounded-md transition-colors cursor-pointer print-compact min-h-[44px] flex items-center ${
                    isLastViewed
                      ? 'bg-yellow-200 hover:bg-yellow-300 text-yellow-900 border-2 border-yellow-500 hover:border-yellow-600 font-semibold shadow-md pr-10'
                      : ref.favorite 
                        ? 'bg-blue-200 hover:bg-blue-300 text-blue-900 border-2 border-blue-400 hover:border-blue-500 font-medium' 
                        : 'bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-200 hover:border-blue-300'
                  }`}
                >
                  {ref.reference}
                </button>
              </ScriptureHoverModal>
              {isLastViewed && (
                <button
                  onClick={handlePinClick}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-yellow-700 hover:text-yellow-800 cursor-pointer transition-colors p-1 z-10"
                  title="Click to clear progress"
                >
                  📍
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface QuestionsProps {
  questions: QuestionAnswer[]
  profileSlug: string
  savedAnswers?: Array<{ questionId: string; answer: string; answeredAt: Date }>
  onScriptureClick?: (reference: string) => void
}

function Questions({ questions, profileSlug, savedAnswers = [], onScriptureClick }: QuestionsProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [savedStatus, setSavedStatus] = useState<Record<string, boolean>>({})
  const [isInitialized, setIsInitialized] = useState(false)
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({})
  const [showComaModal, setShowComaModal] = useState(false)

  // Load saved answers from profile data on mount (only once)
  useEffect(() => {
    if (!isInitialized && savedAnswers.length >= 0) {
      const loadedAnswers: Record<string, string> = {}
      questions.forEach(q => {
        const savedAnswer = savedAnswers.find(sa => sa.questionId === q.id)
        if (savedAnswer) {
          loadedAnswers[q.id] = savedAnswer.answer
        }
      })
      setAnswers(loadedAnswers)
      setIsInitialized(true)
    }
  }, [isInitialized, questions, savedAnswers])

  const toggleQuestion = (questionId: string) => {
    setExpandedQuestions(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }))
  }

  // Parse question to extract prefix and detail (e.g., "Context:" and the rest)
  const parseQuestion = (questionText: string) => {
    // Extract plain text from HTML to check for collapsible patterns
    const hasHtmlTags = /<[^>]+>/.test(questionText)
    let plainText = questionText
    
    if (hasHtmlTags) {
      // Remove HTML tags to get plain text for parsing
      plainText = questionText.replace(/<[^>]+>/g, '')
    }
    
    // Only treat as collapsible if it starts with specific patterns like "Context:", "Observation:", etc.
    // This is more restrictive and prevents accidental collapsing
    const collapsiblePrefixes = ['Context:', 'Observation:', 'Meaning:', 'Application:']
    const startsWithCollapsiblePrefix = collapsiblePrefixes.some(prefix => 
      plainText.trim().startsWith(prefix)
    )
    
    if (!startsWithCollapsiblePrefix) {
      return { prefix: questionText, detail: null }
    }
    
    // Find the first colon in the plain text
    const colonIndex = plainText.indexOf(':')
    if (colonIndex !== -1 && colonIndex > 0) {
      // Split at the first colon on plain text
      const prefixPlain = plainText.substring(0, colonIndex + 1) // Include the colon
      const detailPlain = plainText.substring(colonIndex + 1).trim() // Everything after, trimmed
      
      // Only treat as collapsible if there's actual detail text
      if (detailPlain.length > 0) {
        // For the prefix, extract just the plain text part from the original
        // This preserves any HTML formatting in the prefix
        const prefixEndInOriginal = questionText.indexOf(prefixPlain.substring(prefixPlain.length - 1)) + 1
        const prefix = questionText.substring(0, prefixEndInOriginal)
        
        // For detail, use the original HTML after the colon
        const colonIndexInOriginal = questionText.indexOf(':')
        const detail = questionText.substring(colonIndexInOriginal + 1).trim()
        
        return { prefix, detail }
      }
    }
    return { prefix: questionText, detail: null }
  }

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }))
    // Clear saved status when user edits
    setSavedStatus(prev => ({
      ...prev,
      [questionId]: false
    }))
  }

  const handleSaveAnswer = async (questionId: string, maxLength?: number) => {
    const answer = answers[questionId] || ''
    const limit = maxLength || PROFILE_VALIDATION.ANSWER_MAX_LENGTH

    // Validate length
    if (answer.length > limit) {
      alert(`Answer must be ${limit} characters or less`)
      return
    }

    try {
      // Save to database via API
      const response = await fetch(`/api/profiles/${profileSlug}/save-answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId,
          answer
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save answer')
      }

      // Show saved confirmation
      setSavedStatus(prev => ({
        ...prev,
        [questionId]: true
      }))

      // Clear confirmation after 3 seconds
      setTimeout(() => {
        setSavedStatus(prev => ({
          ...prev,
          [questionId]: false
        }))
      }, 3000)
    } catch (error) {
      console.error('Error saving answer:', error)
      alert('Failed to save answer. Please try again.')
    }
  }

  if (!questions || questions.length === 0) return null

  return (
    <>
      <ComaModal isOpen={showComaModal} onClose={() => setShowComaModal(false)} />
      <div className="mt-4 space-y-3">
      <h5 className="text-base font-semibold text-slate-700 border-b border-slate-200 pb-1">
        Reflection Questions
      </h5>
      {questions.map((question, index) => {
        const currentAnswer = answers[question.id] || ''
        const maxLength = question.maxLength || PROFILE_VALIDATION.ANSWER_MAX_LENGTH
        const isSaved = savedStatus[question.id]
        const isExpanded = expandedQuestions[question.id]
        const { prefix, detail } = parseQuestion(question.question)
        const hasHtmlTags = /<[^>]+>/.test(question.question)
        
        return (
          <div key={question.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3 print:p-2 print:space-y-1">
            <div className="mb-2 flex gap-1 items-baseline">
              <span className="text-sm text-slate-600 flex-shrink-0 leading-none">{index + 1}. </span>
              <div className="flex-1">
                {detail ? (
                  <div>
                    <button
                      onClick={() => toggleQuestion(question.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors"
                    >
                      {hasHtmlTags ? (
                        <span dangerouslySetInnerHTML={{ __html: prefix }} />
                      ) : (
                        prefix
                      )}
                      <svg 
                        className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isExpanded && (
                      <div className="mt-2 text-sm text-slate-700 pl-4 border-l-2 border-blue-200">
                        {hasHtmlTags ? (
                          <div 
                            className="prose prose-slate max-w-none"
                            dangerouslySetInnerHTML={{ __html: detail }}
                          />
                        ) : (
                          <TextWithComaButtons text={detail} onComaClick={() => setShowComaModal(true)} />
                        )}
                      </div>
                    )}
                  </div>
                ) : hasHtmlTags ? (
                  <div 
                    className="question-content font-medium text-slate-800 text-sm max-w-none mt-0"
                  >
                    <TextWithComaButtons 
                      text={question.question} 
                      onComaClick={() => setShowComaModal(true)}
                      onScriptureClick={onScriptureClick}
                    />
                  </div>
                ) : (
                  <span className="font-medium text-slate-800 text-sm">
                    <TextWithComaButtons text={question.question} onComaClick={() => setShowComaModal(true)} />
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-1.5 print:space-y-0">
              <textarea
                value={currentAnswer}
                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                placeholder="Type your answer here..."
                maxLength={maxLength}
                rows={3}
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent resize-y bg-white print:px-2 print:py-1 print:min-h-[60px] print:placeholder:text-transparent"
              />
              <div className="flex items-center justify-between print:hidden">
                <span className="text-xs text-slate-500">
                  {currentAnswer.length}/{maxLength} characters
                </span>
                <button
                  onClick={() => handleSaveAnswer(question.id, question.maxLength)}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
                    isSaved
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-500 hover:bg-slate-600 text-white'
                  }`}
                >
                  {isSaved ? '✓ Saved' : 'Save Answer'}
                </button>
              </div>
            </div>
          </div>
        )
      })}
      </div>
    </>
  )
}

function NestedSubsectionComponent({ nestedSubsection, onScriptureClick, lastViewedScripture, onClearProgress, profileSlug, savedAnswers }: NestedSubsectionProps) {
  const [showComaModal, setShowComaModal] = useState(false)
  
  return (
    <>
      <ComaModal isOpen={showComaModal} onClose={() => setShowComaModal(false)} />
      <div className="ml-6 mt-4 border-l-2 border-gray-200 pl-4 print-subsection">
        <h5 
          className="font-medium text-slate-800 mb-2 print-subsection-title text-lg md:text-xl"
        >
          <TextWithComaButtons 
            text={nestedSubsection.title} 
            onComaClick={() => setShowComaModal(true)}
            onScriptureClick={onScriptureClick}
          />
        </h5>
        <div className="text-slate-700 mb-2 print-content text-base md:text-lg leading-relaxed">
          <TextWithComaButtons 
            text={nestedSubsection.content} 
            onComaClick={() => setShowComaModal(true)}
            onScriptureClick={onScriptureClick}
          />
        </div>
        {nestedSubsection.scriptureReferences && (
          <ScriptureReferences 
            references={nestedSubsection.scriptureReferences} 
            onScriptureClick={onScriptureClick} 
            lastViewedScripture={lastViewedScripture}
            onClearProgress={onClearProgress}
          />
        )}
        {nestedSubsection.questions && (
          <Questions 
            questions={nestedSubsection.questions}
            profileSlug={profileSlug}
            savedAnswers={savedAnswers}
            onScriptureClick={onScriptureClick}
          />
        )}
      </div>
    </>
  )
}

function SubsectionComponent({ subsection, sectionId, subsectionIndex, onScriptureClick, lastViewedScripture, onClearProgress, profileSlug, savedAnswers }: SubsectionProps) {
  const [showComaModal, setShowComaModal] = useState(false)
  
  return (
    <>
      <ComaModal isOpen={showComaModal} onClose={() => setShowComaModal(false)} />
      <div id={`${sectionId}-${subsectionIndex}`} className="mb-6 print-subsection">
        <h4 
          className="text-xl md:text-2xl font-semibold text-slate-800 mb-3 print-subsection-title"
        >
          <TextWithComaButtons 
            text={subsection.title} 
            onComaClick={() => setShowComaModal(true)}
            onScriptureClick={onScriptureClick}
          />
        </h4>
        <div className="text-slate-700 mb-3 leading-relaxed print-content text-base md:text-lg">
          <TextWithComaButtons 
            text={subsection.content} 
            onComaClick={() => setShowComaModal(true)}
            onScriptureClick={onScriptureClick}
          />
        </div>
      
        {subsection.scriptureReferences && (
          <ScriptureReferences 
            references={subsection.scriptureReferences} 
            onScriptureClick={onScriptureClick} 
            lastViewedScripture={lastViewedScripture}
            onClearProgress={onClearProgress}
          />
        )}
      
      {subsection.questions && (
        <Questions 
          questions={subsection.questions}
          profileSlug={profileSlug}
          savedAnswers={savedAnswers}
          onScriptureClick={onScriptureClick}
        />
      )}
      
      {subsection.nestedSubsections && (
        <div className="mt-4">
          {subsection.nestedSubsections.map((nestedSub, nestedIndex) => (
            <NestedSubsectionComponent
              key={nestedIndex}
              nestedSubsection={nestedSub}
              onScriptureClick={onScriptureClick}
              lastViewedScripture={lastViewedScripture}
              onClearProgress={onClearProgress}
              profileSlug={profileSlug}
              savedAnswers={savedAnswers}
            />
          ))}
        </div>
      )}
      </div>
    </>
  )
}

export default function GospelSection({ section, onScriptureClick, lastViewedScripture, onClearProgress, profileSlug, savedAnswers }: GospelSectionProps) {
  const sectionId = `section-${section.section}`
  const [showComaModal, setShowComaModal] = useState(false)
  
  return (
    <section id={sectionId} className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 print-section">
      <ComaModal isOpen={showComaModal} onClose={() => setShowComaModal(false)} />
      <h3 
        className="text-3xl md:text-4xl font-bold text-slate-800 mb-6 pb-3 border-b border-gray-200 print-section-header"
      >
        <TextWithComaButtons 
          text={section.title} 
          onComaClick={() => setShowComaModal(true)}
          onScriptureClick={onScriptureClick}
        />
      </h3>
      
      {/* Optional Link Section */}
      {section.linkUrl && (
        <div className="mb-6 -mt-2">
          <a
            href={section.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-base md:text-lg rounded-md bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-200 hover:border-blue-300 transition-colors min-h-[44px]"
          >
            {section.linkDescription || 'Visit Link'} ⧉
          </a>
        </div>
      )}
      
      <div className="space-y-8">
        {section.subsections.map((subsection, index) => (
          <SubsectionComponent
            key={index}
            subsection={subsection}
            sectionId={sectionId}
            subsectionIndex={index}
            onScriptureClick={onScriptureClick}
            lastViewedScripture={lastViewedScripture}
            onClearProgress={onClearProgress}
            profileSlug={profileSlug}
            savedAnswers={savedAnswers}
          />
        ))}
      </div>
    </section>
  )
}