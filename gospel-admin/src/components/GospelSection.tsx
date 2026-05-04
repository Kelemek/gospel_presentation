'use client'

import { GospelSection as GospelSectionType, Subsection, NestedSubsection, ScriptureReference, QuestionAnswer, PROFILE_VALIDATION, SavedAnswer } from '@/lib/types'
import ScriptureHoverModal from './ScriptureHoverModal'
import ComaModal from './ComaModal'
import FourRulesModal from './FourRulesModal'
import VersePinGlyph from './VersePinGlyph'
import React, { useState, useEffect } from 'react'
import { useAlertModal } from '@/contexts/AlertModalContext'
import type { VersePinAnchoredEntry, VersePinColorId } from '@/lib/versePinStorage'
import { anchoredPinMatchesDisplayRow } from '@/lib/versePinStorage'
import GospelInlineHtml from '@/components/GospelInlineHtml'
import { VERSE_PIN_PILL_STYLES } from '@/components/gospelInlinePillStyles'

type ScriptureClickHandler = (
  reference: string,
  anchorSectionId?: string,
  anchorSubsectionId?: string
) => void

type VersePinRemoveHandler = (pin: Pick<VersePinAnchoredEntry, 'bookmarkId' | 'colorId'>) => void

const ANSWERS_STORAGE_KEY_PREFIX = 'gospel-answers-'


const VERSE_PIN_CARD_CLASSES: Record<VersePinColorId, string> = {
  red:
    'bg-red-200 dark:bg-red-950/45 hover:bg-red-300 dark:hover:bg-red-900/60 text-red-900 dark:text-red-100 border-2 border-red-500 dark:border-red-700 hover:border-red-600 dark:hover:border-red-500 font-semibold shadow-md pr-10',
  blue:
    'bg-blue-200 dark:bg-blue-950/40 hover:bg-blue-300 dark:hover:bg-blue-900/55 text-blue-900 dark:text-blue-100 border-2 border-blue-500 dark:border-blue-700 hover:border-blue-600 dark:hover:border-blue-500 font-semibold shadow-md pr-10',
  yellow:
    'bg-yellow-200 dark:bg-yellow-900/40 hover:bg-yellow-300 dark:hover:bg-yellow-900/60 text-yellow-900 dark:text-yellow-100 border-2 border-yellow-500 dark:border-yellow-700 hover:border-yellow-600 dark:hover:border-yellow-500 font-semibold shadow-md pr-10',
  green:
    'bg-emerald-200 dark:bg-emerald-950/40 hover:bg-emerald-300 dark:hover:bg-emerald-900/55 text-emerald-950 dark:text-emerald-50 border-2 border-emerald-600 dark:border-emerald-700 hover:border-emerald-700 dark:hover:border-emerald-500 font-semibold shadow-md pr-10',
  violet:
    'bg-violet-200 dark:bg-violet-950/40 hover:bg-violet-300 dark:hover:bg-violet-900/55 text-violet-900 dark:text-violet-100 border-2 border-violet-600 dark:border-violet-700 hover:border-violet-700 dark:hover:border-violet-500 font-semibold shadow-md pr-10',
}

function versePinForRow(
  versePins: VersePinAnchoredEntry[] | undefined,
  reference: string,
  anchorSectionId: string | undefined,
  anchorSubsectionId: string | undefined
): VersePinAnchoredEntry | null {
  if (!versePins?.length || !anchorSectionId || !anchorSubsectionId) return null
  return (
    versePins.find((pin) =>
      anchoredPinMatchesDisplayRow(pin, reference, anchorSectionId, anchorSubsectionId)
    ) ?? null
  )
}

/** Rich profile HTML with COMA / Four Rules / scripture inlines (DOM-safe; preserves lists). */
function TextWithComaButtons({
  text,
  onComaClick,
  onScriptureClick,
  onFourRulesClick,
  anchorSectionId,
  anchorSubsectionId,
  versePins,
  onRemoveVersePin,
}: {
  text: string
  onComaClick: () => void
  onScriptureClick?: ScriptureClickHandler
  onFourRulesClick?: () => void
  anchorSectionId?: string
  anchorSubsectionId?: string
  versePins?: VersePinAnchoredEntry[]
  onRemoveVersePin?: VersePinRemoveHandler
}) {
  return (
    <GospelInlineHtml
      html={text ?? ''}
      onComaClick={onComaClick}
      onScriptureClick={onScriptureClick}
      onFourRulesClick={onFourRulesClick}
      anchorSectionId={anchorSectionId}
      anchorSubsectionId={anchorSubsectionId}
      versePins={versePins}
      onRemoveVersePin={onRemoveVersePin}
    />
  )
}

interface GospelSectionProps {
  section: GospelSectionType
  onScriptureClick: ScriptureClickHandler
  versePins?: VersePinAnchoredEntry[]
  onRemoveVersePin?: VersePinRemoveHandler
  profileSlug: string
  savedAnswers?: SavedAnswer[]
  isLoggedIn?: boolean
}

interface ScriptureReferencesProps {
  references: ScriptureReference[]
  onScriptureClick: ScriptureClickHandler
  anchorSectionId: string
  anchorSubsectionId: string
  versePins?: VersePinAnchoredEntry[]
  onRemoveVersePin?: VersePinRemoveHandler
}

interface SubsectionProps {
  subsection: Subsection
  sectionId: string
  subsectionIndex: number
  onScriptureClick: ScriptureClickHandler
  versePins?: VersePinAnchoredEntry[]
  onRemoveVersePin?: VersePinRemoveHandler
  profileSlug: string
  savedAnswers?: SavedAnswer[]
  isLoggedIn?: boolean
}

interface NestedSubsectionProps {
  nestedSubsection: NestedSubsection
  sectionAnchorId: string
  nestedId: string
  onScriptureClick: ScriptureClickHandler
  versePins?: VersePinAnchoredEntry[]
  onRemoveVersePin?: VersePinRemoveHandler
  profileSlug: string
  savedAnswers?: SavedAnswer[]
  isLoggedIn?: boolean
}

function ScriptureReferences({
  references,
  onScriptureClick,
  anchorSectionId,
  anchorSubsectionId,
  versePins,
  onRemoveVersePin,
}: ScriptureReferencesProps) {
  if (!references || references.length === 0) return null

  return (
    <div className="mt-3 print-scripture">
      <div className="flex flex-wrap gap-2">
        {references.map((ref, index) => {
          const rowPin = versePinForRow(versePins, ref.reference, anchorSectionId, anchorSubsectionId)

          const cardTone = rowPin
            ? VERSE_PIN_CARD_CLASSES[rowPin.colorId]
            : ref.favorite
              ? 'bg-blue-200 dark:bg-blue-900/50 hover:bg-blue-300 dark:hover:bg-blue-900/70 text-blue-900 dark:text-blue-100 border-2 border-blue-400 dark:border-blue-600 hover:border-blue-500 dark:hover:border-blue-500 font-medium'
              : 'bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600'

          return (
            <div key={index} className="relative inline-block">
              <ScriptureHoverModal
                reference={ref.reference}
                hoverDelayMs={500} // 0.5 seconds
              >
                <button
                  type="button"
                  data-tour="scripture-card"
                  data-scripture-verse-pinned={rowPin ? 'true' : undefined}
                  data-scripture-pin-color={rowPin?.colorId}
                  onClick={() => onScriptureClick(ref.reference, anchorSectionId, anchorSubsectionId)}
                  className={`px-4 py-2 text-base md:text-lg rounded-md transition-colors cursor-pointer print-compact min-h-[44px] flex items-center ${cardTone}`}
                >
                  {ref.reference}
                </button>
              </ScriptureHoverModal>
              {rowPin && onRemoveVersePin && (
                <button
                  type="button"
                  data-tour="scripture-progress-unpin"
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    onRemoveVersePin({ colorId: rowPin.colorId, bookmarkId: rowPin.bookmarkId })
                  }}
                  className={`absolute right-2 top-1/2 transform -translate-y-1/2 cursor-pointer transition-colors p-1 z-10 ${VERSE_PIN_PILL_STYLES[rowPin.colorId].unpinWrap}`}
                  title={`Remove ${rowPin.colorId} pin for this passage`}
                  aria-label={`Remove ${rowPin.colorId} pin for ${ref.reference}`}
                >
                  <VersePinGlyph colorId={rowPin.colorId} />
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
  onScriptureClick?: ScriptureClickHandler
  isLoggedIn?: boolean
}

function Questions({ questions, profileSlug, savedAnswers = [], onScriptureClick, isLoggedIn = false }: QuestionsProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [savedStatus, setSavedStatus] = useState<Record<string, boolean>>({})
  const [isInitialized, setIsInitialized] = useState(false)
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({})
  const [showComaModal, setShowComaModal] = useState(false)
  const [showFourRulesModal, setShowFourRulesModal] = useState(false)
  const { showAlert } = useAlertModal()

  const storageKey = `${ANSWERS_STORAGE_KEY_PREFIX}${profileSlug}`

  // Load: localStorage first, then merge with DB if logged in (DB overrides)
  useEffect(() => {
    if (!isInitialized && questions.length >= 0) {
      const loadedAnswers: Record<string, string> = {}

      try {
        const stored = localStorage.getItem(storageKey)
        const fromStorage: SavedAnswer[] = stored ? JSON.parse(stored) : []

        if (isLoggedIn && savedAnswers.length > 0) {
          // Prefer DB when logged in
          questions.forEach(q => {
            const fromDb = savedAnswers.find(sa => sa.questionId === q.id)
            const fromLocal = fromStorage.find(sa => sa.questionId === q.id)
            loadedAnswers[q.id] = (fromDb?.answer ?? fromLocal?.answer ?? '') as string
          })
          // Update localStorage with merged result
          const merged: SavedAnswer[] = [...fromStorage]
          savedAnswers.forEach(sa => {
            const idx = merged.findIndex(m => m.questionId === sa.questionId)
            const entry: SavedAnswer = { questionId: sa.questionId, answer: sa.answer, answeredAt: sa.answeredAt }
            if (idx >= 0) merged[idx] = entry
            else merged.push(entry)
          })
          localStorage.setItem(storageKey, JSON.stringify(merged))
        } else {
          // Anonymous or no DB data: use localStorage only
          questions.forEach(q => {
            const saved = fromStorage.find(sa => sa.questionId === q.id)
            if (saved) loadedAnswers[q.id] = saved.answer
          })
        }
      } catch {
        // Fallback to savedAnswers from props if localStorage parse fails
        questions.forEach(q => {
          const saved = savedAnswers.find(sa => sa.questionId === q.id)
          if (saved) loadedAnswers[q.id] = saved.answer
        })
      }

      setAnswers(loadedAnswers)
      setIsInitialized(true)
    }
  }, [isInitialized, questions, savedAnswers, isLoggedIn, storageKey])

  const toggleQuestion = (questionId: string) => {
    setExpandedQuestions(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }))
  }

  // Parse question to extract prefix and detail (e.g., "Context:" and the rest)
  const parseQuestion = (questionText: string) => {
    if (!questionText || typeof questionText !== 'string') {
      return { prefix: '', detail: null }
    }
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
      showAlert(`Answer must be ${limit} characters or less`)
      return
    }

    const trimmed = answer.trim()

    // Always write to localStorage immediately (omit empty answers so merge/load matches server clear)
    try {
      const stored = localStorage.getItem(storageKey)
      const fromStorage: SavedAnswer[] = stored ? JSON.parse(stored) : []
      const updated = fromStorage.filter(sa => sa.questionId !== questionId)
      if (trimmed !== '') {
        updated.push({ questionId, answer: trimmed, answeredAt: new Date() })
      }
      localStorage.setItem(storageKey, JSON.stringify(updated))
    } catch (e) {
      console.error('Error saving to localStorage:', e)
    }

    setSavedStatus(prev => ({ ...prev, [questionId]: true }))
    setTimeout(() => setSavedStatus(prev => ({ ...prev, [questionId]: false })), 3000)

    // If logged in, sync to DB
    if (!isLoggedIn) return

    try {
      const response = await fetch(`/api/profiles/${profileSlug}/save-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, answer: trimmed })
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to save answer')
      }
    } catch (error) {
      console.error('Error syncing answer to DB:', error)
      showAlert('Answer saved locally but could not sync. It will sync when you next log in.')
    }
  }

  if (!questions || questions.length === 0) return null

  return (
    <>
      <ComaModal isOpen={showComaModal} onClose={() => setShowComaModal(false)} />
      <FourRulesModal isOpen={showFourRulesModal} onClose={() => setShowFourRulesModal(false)} />
      <div className="mt-4 space-y-3">
      <h5 className="text-base font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-600 pb-1">
        Reflection Questions
      </h5>
      {(questions || []).filter((q): q is QuestionAnswer => q && typeof q === 'object' && !Array.isArray(q)).map((question, index) => {
        const currentAnswer = answers[question.id] ?? ''
        const maxLength = question.maxLength || PROFILE_VALIDATION.ANSWER_MAX_LENGTH
        const isSaved = savedStatus[question.id]
        const isExpanded = expandedQuestions[question.id]
        const questionContent = question.question ?? ''
        const { prefix, detail } = parseQuestion(questionContent)
        const hasHtmlTags = /<[^>]+>/.test(questionContent)
        
        return (
          <div
            key={question.id ?? `q-${index}`}
            data-tour="profile-question-block"
            className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg p-3 print:p-2 print:space-y-1"
          >
            <div className="mb-2 flex gap-1 items-baseline">
              <span className="text-sm text-slate-600 dark:text-slate-300 shrink-0 leading-none">{index + 1}. </span>
              <div className="flex-1">
                {detail ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => toggleQuestion(question.id)}
                      className="inline-flex cursor-pointer items-center gap-1 px-2 py-1 text-sm font-medium text-blue-700 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-700 rounded transition-colors"
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
                      <div className="mt-2 text-sm text-slate-700 dark:text-slate-300 pl-4 border-l-2 border-blue-200 dark:border-blue-700">
                        {hasHtmlTags ? (
                          <div 
                            className={
                              'prose prose-sm prose-slate max-w-none ' +
                              'text-slate-700 dark:text-slate-200 ' +
                              'prose-p:my-2 prose-p:text-slate-700 dark:prose-p:text-slate-200 ' +
                              'prose-li:text-slate-700 dark:prose-li:text-slate-200 ' +
                              'prose-strong:text-slate-800 dark:prose-strong:text-slate-100'
                            }
                            dangerouslySetInnerHTML={{ __html: detail }}
                          />
                        ) : (
                          <TextWithComaButtons text={detail} onComaClick={() => setShowComaModal(true)} onFourRulesClick={() => setShowFourRulesModal(true)} />
                        )}
                      </div>
                    )}
                  </div>
                ) : hasHtmlTags ? (
                  <div 
                    className="question-content font-medium text-slate-800 dark:text-slate-100 text-sm max-w-none mt-0"
                  >
                    <TextWithComaButtons 
                      text={questionContent} 
                      onComaClick={() => setShowComaModal(true)}
                      onScriptureClick={onScriptureClick}
                      onFourRulesClick={() => setShowFourRulesModal(true)}
                    />
                  </div>
                ) : (
                  <span className="font-medium text-slate-800 dark:text-slate-100 text-sm">
                    <TextWithComaButtons text={questionContent} onComaClick={() => setShowComaModal(true)} onFourRulesClick={() => setShowFourRulesModal(true)} />
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
                className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 focus:border-transparent resize-y bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 print:px-2 print:py-1 print:min-h-[60px] print:placeholder:text-transparent"
              />
              <div className="flex items-center justify-between print:hidden">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {currentAnswer.length}/{maxLength} characters
                </span>
                <button
                  type="button"
                  data-tour="profile-save-answer"
                  onClick={() => handleSaveAnswer(question.id, question.maxLength)}
                  className={`cursor-pointer px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
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

function NestedSubsectionComponent({ nestedSubsection, sectionAnchorId, nestedId, onScriptureClick, versePins, onRemoveVersePin, profileSlug, savedAnswers, isLoggedIn }: NestedSubsectionProps) {
  const [showComaModal, setShowComaModal] = useState(false)
  const [showFourRulesModal, setShowFourRulesModal] = useState(false)

  return (
    <>
      <ComaModal isOpen={showComaModal} onClose={() => setShowComaModal(false)} />
      <FourRulesModal isOpen={showFourRulesModal} onClose={() => setShowFourRulesModal(false)} />
      <div id={nestedId} className="scroll-mt-20 ml-6 mt-4 pl-4 print-subsection">
        <h5 
          className="font-medium text-slate-800 dark:text-slate-100 mb-2 print-subsection-title text-lg md:text-xl"
        >
          <TextWithComaButtons 
            text={nestedSubsection.title} 
            onComaClick={() => setShowComaModal(true)}
            onScriptureClick={onScriptureClick}
            onFourRulesClick={() => setShowFourRulesModal(true)}
            anchorSectionId={sectionAnchorId}
            anchorSubsectionId={nestedId}
            versePins={versePins}
            onRemoveVersePin={onRemoveVersePin}
          />
        </h5>
        <div className="text-slate-700 dark:text-slate-300 mb-2 print-content text-base md:text-lg leading-relaxed">
          <TextWithComaButtons 
            text={nestedSubsection.content} 
            onComaClick={() => setShowComaModal(true)}
            onScriptureClick={onScriptureClick}
            onFourRulesClick={() => setShowFourRulesModal(true)}
            anchorSectionId={sectionAnchorId}
            anchorSubsectionId={nestedId}
            versePins={versePins}
            onRemoveVersePin={onRemoveVersePin}
          />
        </div>
        {nestedSubsection.scriptureReferences && (
          <ScriptureReferences 
            references={nestedSubsection.scriptureReferences} 
            onScriptureClick={onScriptureClick} 
            anchorSectionId={sectionAnchorId}
            anchorSubsectionId={nestedId}
            versePins={versePins}
            onRemoveVersePin={onRemoveVersePin}
          />
        )}
        {nestedSubsection.questions && (
          <Questions
            questions={nestedSubsection.questions}
            profileSlug={profileSlug}
            savedAnswers={savedAnswers}
            onScriptureClick={onScriptureClick}
            isLoggedIn={isLoggedIn}
          />
        )}
      </div>
    </>
  )
}

function SubsectionComponent({ subsection, sectionId, subsectionIndex, onScriptureClick, versePins, onRemoveVersePin, profileSlug, savedAnswers, isLoggedIn }: SubsectionProps) {
  const [showComaModal, setShowComaModal] = useState(false)
  const [showFourRulesModal, setShowFourRulesModal] = useState(false)

  return (
    <>
      <ComaModal isOpen={showComaModal} onClose={() => setShowComaModal(false)} />
      <FourRulesModal isOpen={showFourRulesModal} onClose={() => setShowFourRulesModal(false)} />
      <div id={`${sectionId}-${subsectionIndex}`} className="scroll-mt-20 mb-6 print-subsection">
        <h4 
          className="text-xl md:text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-3 print-subsection-title"
        >
          <TextWithComaButtons 
            text={subsection.title} 
            onComaClick={() => setShowComaModal(true)}
            onScriptureClick={onScriptureClick}
            onFourRulesClick={() => setShowFourRulesModal(true)}
            anchorSectionId={sectionId}
            anchorSubsectionId={`${sectionId}-${subsectionIndex}`}
            versePins={versePins}
            onRemoveVersePin={onRemoveVersePin}
          />
        </h4>
        {subsection.content && (
          <div className="text-slate-700 dark:text-slate-300 mb-3 leading-relaxed print-content text-base md:text-lg">
            <TextWithComaButtons 
              text={subsection.content} 
              onComaClick={() => setShowComaModal(true)}
              onScriptureClick={onScriptureClick}
              onFourRulesClick={() => setShowFourRulesModal(true)}
              anchorSectionId={sectionId}
              anchorSubsectionId={`${sectionId}-${subsectionIndex}`}
              versePins={versePins}
              onRemoveVersePin={onRemoveVersePin}
            />
          </div>
        )}
      
        {subsection.scriptureReferences && (
          <ScriptureReferences 
            references={subsection.scriptureReferences} 
            onScriptureClick={onScriptureClick} 
            anchorSectionId={sectionId}
            anchorSubsectionId={`${sectionId}-${subsectionIndex}`}
            versePins={versePins}
            onRemoveVersePin={onRemoveVersePin}
          />
        )}
      
      {subsection.questions && (
        <Questions
          questions={subsection.questions}
          profileSlug={profileSlug}
          savedAnswers={savedAnswers}
          onScriptureClick={onScriptureClick}
          isLoggedIn={isLoggedIn}
        />
      )}
      
      {subsection.nestedSubsections && (
        <div className="mt-4">
          {subsection.nestedSubsections.map((nestedSub, nestedIndex) => (
            <NestedSubsectionComponent
              key={nestedIndex}
              nestedSubsection={nestedSub}
              sectionAnchorId={sectionId}
              nestedId={`${sectionId}-${subsectionIndex}-${nestedIndex}`}
              onScriptureClick={onScriptureClick}
              versePins={versePins}
              onRemoveVersePin={onRemoveVersePin}
              profileSlug={profileSlug}
              savedAnswers={savedAnswers}
              isLoggedIn={isLoggedIn}
            />
          ))}
        </div>
      )}
      </div>
    </>
  )
}

export default function GospelSection({ section, onScriptureClick, versePins, onRemoveVersePin, profileSlug, savedAnswers, isLoggedIn }: GospelSectionProps) {
  const sectionId = `section-${section.section}`
  const [showComaModal, setShowComaModal] = useState(false)
  const [showFourRulesModal, setShowFourRulesModal] = useState(false)

  return (
    <section id={sectionId} className="scroll-mt-20 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-600 p-8 print-section">
      <ComaModal isOpen={showComaModal} onClose={() => setShowComaModal(false)} />
      <FourRulesModal isOpen={showFourRulesModal} onClose={() => setShowFourRulesModal(false)} />
      <h3 
        className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-6 pb-3 border-b border-gray-200 dark:border-slate-600 print-section-header"
      >
        <TextWithComaButtons 
          text={section.title} 
          onComaClick={() => setShowComaModal(true)}
          onScriptureClick={onScriptureClick}
          onFourRulesClick={() => setShowFourRulesModal(true)}
          anchorSectionId={sectionId}
          anchorSubsectionId={sectionId}
          versePins={versePins}
          onRemoveVersePin={onRemoveVersePin}
        />
      </h3>
      
      {/* Optional Link Section */}
      {section.linkUrl && (
        <div className="mb-6 -mt-2">
          <a
            href={section.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-tour="profile-section-external-link"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-base md:text-lg rounded-md bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors min-h-[44px] whitespace-nowrap"
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
            versePins={versePins}
            onRemoveVersePin={onRemoveVersePin}
            profileSlug={profileSlug}
            savedAnswers={savedAnswers}
            isLoggedIn={isLoggedIn}
          />
        ))}
      </div>
    </section>
  )
}