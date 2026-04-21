'use client'

import { GospelSection } from '@/lib/types'
import type { PublicResourceItem } from '@/lib/supabase-data-service'
import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslation, BibleTranslation } from '@/contexts/TranslationContext'
import { useTextSize } from '@/contexts/TextSizeContext'
import { Capacitor } from '@capacitor/core'
import { Printer } from '@capgo/capacitor-printer'
import { stripHtmlTags } from '@/lib/stripHtmlTags'
import { scrollToTocAnchor } from '@/lib/scrollToTocAnchor'
import { groupPublicResourceItems } from '@/lib/groupPublicResourceItems'
import MemorizeDropdown from '@/components/MemorizeDropdown'
import type { MemorizedVerse } from '@/lib/verseMemorizationStorage'

interface TableOfContentsProps {
  sections: GospelSection[]
  currentProfileSlug?: string
  /** Called when a TOC link is clicked (e.g. to close the side menu) */
  onNavigate?: () => void
  /** When set, Practice opens here so the slide-out can close without unmounting the session (parent portals the modal). */
  onMemorizationPracticeStart?: (verse: MemorizedVerse) => void
}

// Helper to check if a title is blank (used to filter out empty TOC entries)
function isTitleBlank(title: string | undefined): boolean {
  return !stripHtmlTags(title ?? '').trim()
}

function handleTocClick(
  e: React.MouseEvent<HTMLAnchorElement>,
  href: string,
  onNavigate?: () => void
) {
  if (!href.startsWith('#')) return
  const id = href.slice(1)
  if (scrollToTocAnchor(id)) {
    e.preventDefault()
    onNavigate?.()
  }
}

export default function TableOfContents({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  sections, currentProfileSlug: _currentProfileSlug, onNavigate, onMemorizationPracticeStart
}: TableOfContentsProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [resourceItems, setResourceItems] = useState<PublicResourceItem[]>([])
  const [resourcesRequestDone, setResourcesRequestDone] = useState(false)
  const [isResourcesOpen, setIsResourcesOpen] = useState(false)
  const [isTextSizeOpen, setIsTextSizeOpen] = useState(false)
  const [isTranslationOpen, setIsTranslationOpen] = useState(false)
  const { textSize, setTextSize } = useTextSize()
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(new Set())
  const { translation, setTranslation, enabledTranslationOptions } = useTranslation()

  const toggleCategory = useCallback((id: string) => {
    setExpandedCategoryIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)
    }
    checkAuth()
  }, [])

  useEffect(() => {
    if (isLoggedIn && Capacitor.isNativePlatform()) return
    let cancelled = false
    const fetchResources = async () => {
      try {
        const res = await fetch('/api/profiles/public-templates')
        if (!cancelled && res.ok) {
          const data = await res.json()
          setResourceItems(data.items || [])
        }
      } catch {
        if (!cancelled) setResourceItems([])
      } finally {
        if (!cancelled) setResourcesRequestDone(true)
      }
    }
    fetchResources()
    return () => {
      cancelled = true
    }
  }, [isLoggedIn])

  const handlePrint = async () => {
    if (Capacitor.isNativePlatform()) {
      await Printer.printWebView({ name: 'Gospel Presentation' })
    } else {
      window.print()
    }
  }

  const handlePickTranslation = async (code: BibleTranslation) => {
    await setTranslation(code)
    setIsTranslationOpen(false)
  }

  const isNative = Capacitor.isNativePlatform()

  return (
    <div className="space-y-4 md:space-y-3">
      {/* Resources dropdown - on web always; on native only when not logged in */}
      {(!isNative || !isLoggedIn) && (
        <div>
          <button
            type="button"
            data-tour="toc-resources-toggle"
            onClick={() => setIsResourcesOpen(!isResourcesOpen)}
            className="inline-flex items-center w-full px-4 py-3 text-base md:text-lg font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 active:bg-slate-300 dark:active:bg-slate-500 border border-slate-300 dark:border-slate-600 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md min-h-[48px] cursor-pointer"
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
            <div
              data-tour="resources-list-panel"
              data-resources-loaded={resourcesRequestDone ? 'true' : 'false'}
              className="mt-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 shadow-sm overflow-hidden"
              role="list"
            >
              {resourceItems.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                  No resources available
                </div>
              ) : (
                groupPublicResourceItems(resourceItems).map((group, groupIndex) =>
                  group.kind === 'templates' ? (
                    <div
                      key={`resource-templates-${groupIndex}`}
                      data-resource-templates-block={String(groupIndex)}
                      className="border-b border-slate-100 dark:border-slate-600 last:border-b-0"
                    >
                      {group.items.map((item) => (
                        <Link
                          key={item.slug}
                          href={`/${item.slug}`}
                          data-resource-template-slug={item.slug}
                          className="block px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-600 last:border-b-0 transition-colors"
                        >
                          {item.title}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div
                      key={group.item.id}
                      data-resource-category-id={group.item.id}
                      className="border-b border-slate-100 dark:border-slate-600 last:border-b-0"
                    >
                      <button
                        type="button"
                        data-tour="resource-category"
                        data-resource-category-label={group.item.name}
                        onClick={() => toggleCategory(group.item.id)}
                        className="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left"
                        aria-expanded={expandedCategoryIds.has(group.item.id)}
                      >
                        <span className="font-medium">{group.item.name}</span>
                        <span className={`ml-auto shrink-0 transition-transform ${expandedCategoryIds.has(group.item.id) ? 'rotate-180' : ''}`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </span>
                      </button>
                      {expandedCategoryIds.has(group.item.id) && group.item.templates.length > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-700/50">
                          {group.item.templates.map((t) => (
                            <Link
                              key={t.slug}
                              href={`/${t.slug}`}
                              data-resource-template-slug={t.slug}
                              className="block py-2 pl-8 pr-4 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-600 last:border-b-0 transition-colors"
                            >
                              {t.title}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* Text size dropdown — same design as Resources */}
      <div>
        <button
          type="button"
          data-tour="toc-text-size-toggle"
          onClick={() => setIsTextSizeOpen(!isTextSizeOpen)}
          className="inline-flex items-center w-full px-4 py-3 text-base md:text-lg font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 active:bg-slate-300 dark:active:bg-slate-500 border border-slate-300 dark:border-slate-600 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md min-h-[48px] cursor-pointer"
          aria-expanded={isTextSizeOpen}
          aria-haspopup="listbox"
        >
          <span className="mr-2 font-serif font-semibold text-lg leading-none" aria-hidden>
            Aa
          </span>
          Text size
          <span className={`ml-auto transition-transform ${isTextSizeOpen ? 'rotate-180' : ''}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>
        {isTextSizeOpen && (
          <div
            data-tour="text-size-panel"
            className="mt-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 shadow-sm overflow-hidden"
            role="listbox"
            aria-label="Text size"
          >
            {(
              [
                { value: 'normal' as const, label: 'Normal' },
                { value: 'larger' as const, label: 'Larger' },
                { value: 'largest' as const, label: 'Largest' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={textSize === opt.value}
                onClick={() => {
                  setTextSize(opt.value)
                  setIsTextSizeOpen(false)
                }}
                className={`flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-sm text-left transition-colors border-b border-slate-100 dark:border-slate-600 last:border-b-0 ${
                  textSize === opt.value
                    ? 'bg-slate-100 dark:bg-slate-700 font-semibold text-slate-900 dark:text-slate-50'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {textSize === opt.value && (
                  <svg className="w-4 h-4 shrink-0 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                <span className={textSize === opt.value ? '' : 'pl-6'}>{opt.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Print + Bible + Memorize: Memorize sits below Bible Translation */}
      <div className="space-y-4 md:space-y-3 pb-4 border-b border-slate-200 dark:border-slate-600">
        <button
          type="button"
          data-tour="toc-print-version"
          onClick={handlePrint}
          className="inline-flex items-center w-full px-4 py-3 text-base md:text-lg font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 active:bg-slate-300 dark:active:bg-slate-500 border border-slate-300 dark:border-slate-600 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md min-h-[48px] cursor-pointer"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print Version
        </button>

        {/* Bible Translation — same button + listbox panel as Text size (OS select menus cannot be themed) */}
        <div data-tour="toc-bible-translation">
          <button
            type="button"
            id="bible-translation"
            data-tour="toc-bible-translation-toggle"
            onClick={() => setIsTranslationOpen(!isTranslationOpen)}
            className="inline-flex items-center w-full px-4 py-3 text-base md:text-lg font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 active:bg-slate-300 dark:active:bg-slate-500 border border-slate-300 dark:border-slate-600 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md min-h-[48px] cursor-pointer"
            aria-expanded={isTranslationOpen}
            aria-haspopup="listbox"
          >
            <svg className="w-5 h-5 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Bible Translation
            <span className={`ml-auto transition-transform ${isTranslationOpen ? 'rotate-180' : ''}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </button>
          {isTranslationOpen && (
            <div
              data-tour="bible-translation-panel"
              className="mt-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 shadow-sm overflow-hidden"
              role="listbox"
              aria-labelledby="bible-translation"
            >
              {enabledTranslationOptions.map(({ translation_code, translation_name }) => (
                <button
                  key={translation_code}
                  type="button"
                  role="option"
                  aria-selected={translation === translation_code}
                  onClick={() => void handlePickTranslation(translation_code as BibleTranslation)}
                  className={`flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-sm text-left transition-colors border-b border-slate-100 dark:border-slate-600 last:border-b-0 ${
                    translation === translation_code
                      ? 'bg-slate-100 dark:bg-slate-700 font-semibold text-slate-900 dark:text-slate-50'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {translation === translation_code && (
                    <svg className="w-4 h-4 shrink-0 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  <span className={translation === translation_code ? '' : 'pl-6'}>{translation_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <MemorizeDropdown
          onNavigate={onNavigate}
          onMemorizationPracticeStart={onMemorizationPracticeStart}
        />
      </div>
      <div data-tour="toc-section-links">
      {sections.map((section) => (
        <div key={section.section} className="mb-4 md:mb-3">
          <a 
            href={`#section-${section.section}`}
            onClick={(e) => handleTocClick(e, `#section-${section.section}`, onNavigate)}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 active:text-blue-900 dark:active:text-blue-200 font-medium text-xl md:text-lg mb-3 md:mb-2 py-3 md:py-2 px-4 md:px-3 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 active:bg-blue-100 dark:active:bg-blue-900/50 transition-colors min-h-[52px] flex items-center"
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
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 active:text-blue-900 dark:active:text-blue-200 text-base md:text-sm py-3 md:py-2 px-4 md:px-3 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 active:bg-blue-100 dark:active:bg-blue-900/50 transition-colors min-h-[48px] flex items-center leading-relaxed"
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
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 active:text-blue-900 dark:active:text-blue-200 text-sm py-2 md:py-1.5 px-3 md:px-2 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 active:bg-blue-100 dark:active:bg-blue-900/50 transition-colors min-h-[40px] flex items-center leading-relaxed"
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
    </div>
  )
}