import { GospelSectionType } from '@/lib/data'

interface TableOfContentsProps {
  sections: GospelSectionType[]
}

export default function TableOfContents({ sections }: TableOfContentsProps) {
  return (
    <div className="space-y-4 md:space-y-3">
      {sections.map((section) => (
        <div key={section.section} className="mb-4 md:mb-3">
          <a 
            href={`#section-${section.section}`}
            className="text-blue-600 hover:text-blue-800 active:text-blue-900 font-medium text-lg md:text-base block mb-3 md:mb-2 py-3 md:py-2 px-4 md:px-3 rounded-md hover:bg-blue-50 active:bg-blue-100 transition-colors min-h-[48px] md:min-h-auto flex items-center"
          >
            {section.section}. {section.title}
          </a>
          <ul className="ml-2 md:ml-4 space-y-2 md:space-y-1">
            {section.subsections.map((subsection, index) => (
              <li key={index}>
                <a 
                  href={`#section-${section.section}-${index}`}
                  className="text-blue-600 hover:text-blue-800 active:text-blue-900 text-sm md:text-xs block py-3 md:py-1.5 px-4 md:px-3 rounded-md hover:bg-blue-50 active:bg-blue-100 transition-colors min-h-[44px] md:min-h-auto flex items-center leading-relaxed"
                >
                  {subsection.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}