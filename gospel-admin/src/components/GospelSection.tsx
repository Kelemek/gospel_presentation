import { GospelSection as GospelSectionType, Subsection, NestedSubsection, ScriptureReference } from '@/lib/types'
import ScriptureHoverModal from './ScriptureHoverModal'

interface GospelSectionProps {
  section: GospelSectionType
  onScriptureClick: (reference: string) => void
}

interface ScriptureReferencesProps {
  references: ScriptureReference[]
  onScriptureClick: (reference: string) => void
}

interface SubsectionProps {
  subsection: Subsection
  sectionId: string
  subsectionIndex: number
  onScriptureClick: (reference: string) => void
}

interface NestedSubsectionProps {
  nestedSubsection: NestedSubsection
  onScriptureClick: (reference: string) => void
}

function ScriptureReferences({ references, onScriptureClick }: ScriptureReferencesProps) {
  if (!references || references.length === 0) return null

  return (
    <div className="mt-3 print-scripture">
      <div className="flex flex-wrap gap-2">
        {references.map((ref, index) => (
          <ScriptureHoverModal
            key={index}
            reference={ref.reference}
            hoverDelayMs={1500} // 1.5 seconds as requested
          >
            <button
              onClick={() => onScriptureClick(ref.reference)}
              className={`inline-block px-3 py-1 text-sm rounded-md transition-colors cursor-pointer print-compact ${
                ref.favorite 
                  ? 'bg-blue-200 hover:bg-blue-300 text-blue-900 border-2 border-blue-400 hover:border-blue-500 font-medium' 
                  : 'bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-200 hover:border-blue-300'
              }`}
            >
              {ref.reference}
            </button>
          </ScriptureHoverModal>
        ))}
      </div>
    </div>
  )
}

function NestedSubsectionComponent({ nestedSubsection, onScriptureClick }: NestedSubsectionProps) {
  return (
    <div className="ml-6 mt-4 border-l-2 border-gray-200 pl-4 print-subsection">
      <h5 className="font-medium text-slate-800 mb-2 print-subsection-title">{nestedSubsection.title}</h5>
      <p className="text-slate-700 mb-2 print-content">{nestedSubsection.content}</p>
      {nestedSubsection.scriptureReferences && (
        <ScriptureReferences 
          references={nestedSubsection.scriptureReferences} 
          onScriptureClick={onScriptureClick} 
        />
      )}
    </div>
  )
}

function SubsectionComponent({ subsection, sectionId, subsectionIndex, onScriptureClick }: SubsectionProps) {
  return (
    <div id={`${sectionId}-${subsectionIndex}`} className="mb-6 print-subsection">
      <h4 className="text-xl font-semibold text-slate-800 mb-3 print-subsection-title">{subsection.title}</h4>
      <p className="text-slate-700 mb-3 leading-relaxed print-content">{subsection.content}</p>
      
      {subsection.scriptureReferences && (
        <ScriptureReferences 
          references={subsection.scriptureReferences} 
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
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function GospelSection({ section, onScriptureClick }: GospelSectionProps) {
  const sectionId = `section-${section.section}`
  
  return (
    <section id={sectionId} className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 print-section">
      <h3 className="text-3xl font-bold text-slate-800 mb-6 pb-3 border-b border-gray-200 print-section-header">
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
          />
        ))}
      </div>
    </section>
  )
}