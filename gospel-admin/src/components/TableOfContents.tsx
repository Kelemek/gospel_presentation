'use client'

import { GospelSection } from '@/lib/types'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation, BibleTranslation } from '@/contexts/TranslationContext'
import { Capacitor } from '@capacitor/core'
import { Printer } from '@capgo/capacitor-printer'

interface PublicTemplate {
  slug: string
  title: string
}

interface TableOfContentsProps {
  sections: GospelSection[]
  currentProfileSlug?: string
  /** Called when a TOC link is clicked (e.g. to close the side menu) */
  onNavigate?: () => void
}

// Helper function to strip HTML tags from text
function stripHtmlTags(html: string): string {
  if (html == null || typeof html !== 'string') return ''
  // Create a temporary DOM element and use textContent to extract plain text
  const temp = document.createElement('div')
  temp.innerHTML = html
  return temp.textContent || temp.innerText || ''
}

// Helper to check if a title is blank (used to filter out empty TOC entries)
function isTitleBlank(title: string | undefined): boolean {
  return !stripHtmlTags(title ?? '').trim()
}

// Scroll to in-page section by id (used so TOC links stay in-app on native instead of opening browser)
function handleTocClick(
  e: React.MouseEvent<HTMLAnchorElement>,
  href: string,
  onNavigate?: () => void
) {
  if (!href.startsWith('#')) return
  const id = href.slice(1)
  const el = document.getElementById(id)
  if (el) {
    e.preventDefault()
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    onNavigate?.()
  }
}

export default function TableOfContents({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  sections, currentProfileSlug: _currentProfileSlug, onNavigate
}: TableOfContentsProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [publicTemplates, setPublicTemplates] = useState<PublicTemplate[]>([])
  const [isResourcesOpen, setIsResourcesOpen] = useState(false)
  const { translation, setTranslation, enabledTranslations } = useTranslation()

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)
    }
    checkAuth()
  }, [])

  useEffect(() => {
    if (isLoggedIn) return
    const fetchPublicTemplates = async () => {
      try {
        const res = await fetch('/api/profiles/public-templates')
        if (res.ok) {
          const data = await res.json()
          setPublicTemplates(data.profiles || [])
        }
      } catch {
        setPublicTemplates([])
      }
    }
    fetchPublicTemplates()
  }, [isLoggedIn])

  const handlePrint = async () => {
    if (Capacitor.isNativePlatform()) {
      await Printer.printWebView({ name: 'Gospel Presentation' })
    } else {
      window.print()
    }
  }

  const handleTranslationChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTranslation = e.target.value as BibleTranslation
    await setTranslation(newTranslation)
  }

  const isNative = Capacitor.isNativePlatform()

  return (
    <div className="space-y-4 md:space-y-3">
      {/* Login/Dashboard Button - Login hidden on native apps */}
      {isLoggedIn ? (
        <Link
          href="/admin"
          className="inline-flex items-center w-full px-4 py-3 text-base md:text-lg font-medium text-white bg-slate-500 hover:bg-slate-600 active:bg-slate-700 border border-slate-600 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md min-h-[48px]"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Dashboard
        </Link>
      ) : !isNative ? (
        <Link 
          href="/login"
          className="inline-flex items-center w-full px-4 py-3 text-base md:text-lg font-medium text-white bg-slate-500 hover:bg-slate-600 active:bg-slate-700 border border-slate-600 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md min-h-[48px]"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          Login
        </Link>
      ) : null}

      {/* Resources dropdown - public templates for anonymous users */}
      {!isLoggedIn && (
        <div>
          <button
            type="button"
            onClick={() => setIsResourcesOpen(!isResourcesOpen)}
            className="inline-flex items-center w-full px-4 py-3 text-base md:text-lg font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-300 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md min-h-[48px] cursor-pointer"
            aria-expanded={isResourcesOpen}
            aria-haspopup="listbox"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Resources
            <span className={`ml-auto transition-transform ${isResourcesOpen ? 'rotate-180' : ''}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </button>
          {isResourcesOpen && (
            <div className="mt-2 border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden" role="listbox">
              {publicTemplates.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-500">
                  No resources available
                </div>
              ) : (
                publicTemplates.map((t) => (
                  <Link
                    key={t.slug}
                    href={`/${t.slug}`}
                    className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition-colors"
                    role="option"
                  >
                    {t.title}
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Print Button */}
      <div className="pb-4 border-b border-slate-200">
        <button
          onClick={handlePrint}
          className="inline-flex items-center w-full px-4 py-3 text-base md:text-lg font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-300 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md min-h-[48px] cursor-pointer"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print Version
        </button>
        
        {/* Bible Translation Selector */}
        <div className="mt-3">
          <label htmlFor="bible-translation" className="block text-sm font-medium text-slate-700 mb-2">
            Bible Translation
          </label>
          <select
            id="bible-translation"
            value={translation}
            onChange={handleTranslationChange}
            className="w-full px-3 py-2 border border-slate-200 hover:border-slate-300 focus:border-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 text-slate-900 bg-white shadow-sm text-sm transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-size-[1.25rem] bg-position-[right_0.5rem_center] bg-no-repeat pr-10"
          >
            {enabledTranslations.includes('esv') && (
              <option value="esv">ESV (English Standard Version)</option>
            )}
            {enabledTranslations.includes('kjv') && (
              <option value="kjv">KJV (King James Version)</option>
            )}
            {enabledTranslations.includes('nasb') && (
              <option value="nasb">NASB (New American Standard Bible)</option>
            )}
            {enabledTranslations.includes('lsb') && (
              <option value="lsb">LSB (Legacy Standard Bible)</option>
            )}
          </select>
        </div>
      </div>
      {sections.map((section) => (
        <div key={section.section} className="mb-4 md:mb-3">
          <a 
            href={`#section-${section.section}`}
            onClick={(e) => handleTocClick(e, `#section-${section.section}`, onNavigate)}
            className="text-blue-600 hover:text-blue-800 active:text-blue-900 font-medium text-xl md:text-lg mb-3 md:mb-2 py-3 md:py-2 px-4 md:px-3 rounded-md hover:bg-blue-50 active:bg-blue-100 transition-colors min-h-[52px] flex items-center"
          >
            {stripHtmlTags(section.title)}
          </a>
          <ul className="ml-2 md:ml-4 space-y-2 md:space-y-1">
            {section.subsections.map((subsection, index) => {
              const nestedSubsections = subsection.nestedSubsections?.filter((n) => !isTitleBlank(n.title)) ?? []
              const hasVisibleNested = nestedSubsections.length > 0
              const subsectionTitleBlank = isTitleBlank(subsection.title)
              // Skip subsections that have neither a title nor visible nested items
              if (subsectionTitleBlank && !hasVisibleNested) return null
              return (
                <li key={index}>
                  {!subsectionTitleBlank && (
                    <a 
                      href={`#section-${section.section}-${index}`}
                      onClick={(e) => handleTocClick(e, `#section-${section.section}-${index}`, onNavigate)}
                      className="text-blue-600 hover:text-blue-800 active:text-blue-900 text-base md:text-sm py-3 md:py-2 px-4 md:px-3 rounded-md hover:bg-blue-50 active:bg-blue-100 transition-colors min-h-[48px] flex items-center leading-relaxed"
                    >
                      {stripHtmlTags(subsection.title)}
                    </a>
                  )}
                  {hasVisibleNested && (
                    <ul className="ml-2 md:ml-4 mt-1 space-y-1">
                      {nestedSubsections.map((nested, nestedIndex) => {
                        const originalNestedIndex = subsection.nestedSubsections!.indexOf(nested)
                        return (
                          <li key={nestedIndex}>
                            <a 
                              href={`#section-${section.section}-${index}-${originalNestedIndex}`}
                              onClick={(e) => handleTocClick(e, `#section-${section.section}-${index}-${originalNestedIndex}`, onNavigate)}
                              className="text-blue-600 hover:text-blue-800 active:text-blue-900 text-sm py-2 md:py-1.5 px-3 md:px-2 rounded-md hover:bg-blue-50 active:bg-blue-100 transition-colors min-h-[40px] flex items-center leading-relaxed"
                            >
                              {stripHtmlTags(nested.title)}
                            </a>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}