import { GospelSection as GospelSectionType, Subsection, NestedSubsection, ScriptureReference, QuestionAnswer, PROFILE_VALIDATION, SavedAnswer } from '@/lib/types'
import ScriptureHoverModal from './ScriptureHoverModal'
import { useState, useEffect } from 'react'

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
}

function Questions({ questions, profileSlug, savedAnswers = [] }: QuestionsProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [savedStatus, setSavedStatus] = useState<Record<string, boolean>>({})
  const [isInitialized, setIsInitialized] = useState(false)

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
    <div className="mt-4 space-y-3">
      <h5 className="text-base font-semibold text-slate-700 border-b border-slate-200 pb-1">
        Reflection Questions
      </h5>
      {questions.map((question, index) => {
        const currentAnswer = answers[question.id] || ''
        const maxLength = question.maxLength || PROFILE_VALIDATION.ANSWER_MAX_LENGTH
        const isSaved = savedStatus[question.id]
        
        return (
          <div key={question.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <p className="font-medium text-slate-800 mb-2 text-sm">
              {index + 1}. {question.question}
            </p>
            <div className="space-y-1.5">
              <textarea
                value={currentAnswer}
                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                placeholder="Type your answer here..."
                maxLength={maxLength}
                rows={3}
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent resize-y bg-white"
              />
              <div className="flex items-center justify-between">
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
  )
}

function NestedSubsectionComponent({ nestedSubsection, onScriptureClick, lastViewedScripture, onClearProgress, profileSlug, savedAnswers }: NestedSubsectionProps) {
  return (
    <div className="ml-6 mt-4 border-l-2 border-gray-200 pl-4 print-subsection">
      <h5 className="font-medium text-slate-800 mb-2 print-subsection-title text-lg md:text-xl">{nestedSubsection.title}</h5>
      <p className="text-slate-700 mb-2 print-content text-base md:text-lg leading-relaxed">{nestedSubsection.content}</p>
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
        />
      )}
    </div>
  )
}

function SubsectionComponent({ subsection, sectionId, subsectionIndex, onScriptureClick, lastViewedScripture, onClearProgress, profileSlug, savedAnswers }: SubsectionProps) {
  return (
    <div id={`${sectionId}-${subsectionIndex}`} className="mb-6 print-subsection">
      <h4 className="text-xl md:text-2xl font-semibold text-slate-800 mb-3 print-subsection-title">{subsection.title}</h4>
      <p className="text-slate-700 mb-3 leading-relaxed print-content text-base md:text-lg">{subsection.content}</p>
      
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
  )
}

export default function GospelSection({ section, onScriptureClick, lastViewedScripture, onClearProgress, profileSlug, savedAnswers }: GospelSectionProps) {
  const sectionId = `section-${section.section}`
  
  return (
    <section id={sectionId} className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 print-section">
      <h3 className="text-3xl md:text-4xl font-bold text-slate-800 mb-6 pb-3 border-b border-gray-200 print-section-header">
        {section.section}. {section.title}
      </h3>
      
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