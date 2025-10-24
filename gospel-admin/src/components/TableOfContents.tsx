import { GospelSection } from '@/lib/types'
import Link from 'next/link'

interface TableOfContentsProps {
  sections: GospelSection[]
}

export default function TableOfContents({ sections }: TableOfContentsProps) {
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-4 md:space-y-3">
      {/* Print Button */}
      <div className="mb-6 pb-4 border-b border-slate-200">
        <button
          onClick={handlePrint}
          className="inline-flex items-center w-full px-4 py-3 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-300 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print Condensed Version
        </button>
      </div>
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
      
      {/* Admin Edit Button */}
      <div className="mt-8 pt-4 border-t border-slate-200">
        <Link 
          href="/admin"
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 hover:text-slate-700 rounded-md transition-colors duration-200 border border-slate-200 shadow-sm"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit Content
        </Link>
      </div>
    </div>
  )
}