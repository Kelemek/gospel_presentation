'use client'

import { GospelSection } from '@/lib/types'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface TableOfContentsProps {
  sections: GospelSection[]
  currentProfileSlug?: string
}

export default function TableOfContents({ sections, currentProfileSlug }: TableOfContentsProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)
    }
    checkAuth()
  }, [])

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-4 md:space-y-3">
      {/* Login/View Profiles Button */}
      <div className="mb-4">
        {isLoggedIn ? (
          <Link
            href="/admin"
            className="inline-flex items-center w-full px-4 py-3 text-base md:text-lg font-medium text-white bg-slate-500 hover:bg-slate-600 active:bg-slate-700 border border-slate-600 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md min-h-[48px]"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            View Profiles
          </Link>
        ) : (
          <Link 
            href="/login"
            className="inline-flex items-center w-full px-4 py-3 text-base md:text-lg font-medium text-white bg-slate-500 hover:bg-slate-600 active:bg-slate-700 border border-slate-600 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md min-h-[48px]"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Login
          </Link>
        )}
      </div>
      
      {/* Print Button */}
      <div className="mb-6 pb-4 border-b border-slate-200">
        <button
          onClick={handlePrint}
          className="inline-flex items-center w-full px-4 py-3 text-base md:text-lg font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-300 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md min-h-[48px]"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print Version
        </button>
      </div>
      {sections.map((section) => (
        <div key={section.section} className="mb-4 md:mb-3">
          <a 
            href={`#section-${section.section}`}
            className="text-blue-600 hover:text-blue-800 active:text-blue-900 font-medium text-xl md:text-lg block mb-3 md:mb-2 py-3 md:py-2 px-4 md:px-3 rounded-md hover:bg-blue-50 active:bg-blue-100 transition-colors min-h-[52px] flex items-center"
          >
            {section.title}
          </a>
          <ul className="ml-2 md:ml-4 space-y-2 md:space-y-1">
            {section.subsections.map((subsection, index) => (
              <li key={index}>
                <a 
                  href={`#section-${section.section}-${index}`}
                  className="text-blue-600 hover:text-blue-800 active:text-blue-900 text-base md:text-sm block py-3 md:py-2 px-4 md:px-3 rounded-md hover:bg-blue-50 active:bg-blue-100 transition-colors min-h-[48px] flex items-center leading-relaxed"
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