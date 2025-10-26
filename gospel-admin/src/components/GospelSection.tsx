import { GospelSection as GospelSectionType, Subsection, NestedSubsection, ScriptureReference } from '@/lib/types'
import ScriptureHoverModal from './ScriptureHoverModal'

interface GospelSectionProps {
  section: GospelSectionType
  onScriptureClick: (reference: string) => void
  lastViewedScripture?: string  // Reference of the last viewed scripture
}

interface ScriptureReferencesProps {
  references: ScriptureReference[]
  onScriptureClick: (reference: string) => void
  lastViewedScripture?: string
}

interface SubsectionProps {
  subsection: Subsection
  sectionId: string
  subsectionIndex: number
  onScriptureClick: (reference: string) => void
  lastViewedScripture?: string
}

interface NestedSubsectionProps {
  nestedSubsection: NestedSubsection
  onScriptureClick: (reference: string) => void
  lastViewedScripture?: string
}

function ScriptureReferences({ references, onScriptureClick, lastViewedScripture }: ScriptureReferencesProps) {
  if (!references || references.length === 0) return null

  return (
    <div className="mt-3 print-scripture">
      <div className="flex flex-wrap gap-2">
        {references.map((ref, index) => {
          const isLastViewed = lastViewedScripture === ref.reference
          
          return (
            <ScriptureHoverModal
              key={index}
              reference={ref.reference}
              hoverDelayMs={1000} // 1 second
            >
              <button
                onClick={() => onScriptureClick(ref.reference)}
                className={`inline-block px-4 py-2 text-base md:text-lg rounded-md transition-colors cursor-pointer print-compact min-h-[44px] flex items-center relative ${
                  isLastViewed
                    ? 'bg-yellow-200 hover:bg-yellow-300 text-yellow-900 border-2 border-yellow-500 hover:border-yellow-600 font-semibold shadow-md'
                    : ref.favorite 
                      ? 'bg-blue-200 hover:bg-blue-300 text-blue-900 border-2 border-blue-400 hover:border-blue-500 font-medium' 
                      : 'bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-200 hover:border-blue-300'
                }`}
              >
                {ref.reference}
                {isLastViewed && (
                  <span className="ml-2 text-yellow-700">
                    📍
                  </span>
                )}
              </button>
            </ScriptureHoverModal>
          )
        })}
      </div>
    </div>
  )
}

function NestedSubsectionComponent({ nestedSubsection, onScriptureClick, lastViewedScripture }: NestedSubsectionProps) {
  return (
    <div className="ml-6 mt-4 border-l-2 border-gray-200 pl-4 print-subsection">
      <h5 className="font-medium text-slate-800 mb-2 print-subsection-title text-lg md:text-xl">{nestedSubsection.title}</h5>
      <p className="text-slate-700 mb-2 print-content text-base md:text-lg leading-relaxed">{nestedSubsection.content}</p>
      {nestedSubsection.scriptureReferences && (
        <ScriptureReferences 
          references={nestedSubsection.scriptureReferences} 
          onScriptureClick={onScriptureClick} 
          lastViewedScripture={lastViewedScripture}
        />
      )}
    </div>
  )
}

function SubsectionComponent({ subsection, sectionId, subsectionIndex, onScriptureClick, lastViewedScripture }: SubsectionProps) {
  return (
    <div id={`${sectionId}-${subsectionIndex}`} className="mb-6 print-subsection">
      <h4 className="text-xl md:text-2xl font-semibold text-slate-800 mb-3 print-subsection-title">{subsection.title}</h4>
      <p className="text-slate-700 mb-3 leading-relaxed print-content text-base md:text-lg">{subsection.content}</p>
      
      {subsection.scriptureReferences && (
        <ScriptureReferences 
          references={subsection.scriptureReferences} 
          onScriptureClick={onScriptureClick} 
          lastViewedScripture={lastViewedScripture}
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
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function GospelSection({ section, onScriptureClick, lastViewedScripture }: GospelSectionProps) {
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
          />
        ))}
      </div>
    </section>
  )
}