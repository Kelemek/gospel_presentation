'use client'

import { GospelSection } from '@/lib/types'
import type { PublicResourceItem } from '@/lib/supabase-data-service'
import Link from 'next/link'
import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  GOSPEL_PRESENTATION_READ_STATUS_CHANGED_EVENT,
  loadPresentationReadCompleteSlugs,
  PRESENTATION_READ_COMPLETE_STORAGE_KEY,
} from '@/lib/presentationReadCompleteStorage'
import { createClient } from '@/lib/supabase/client'
import { useTranslation, BibleTranslation } from '@/contexts/TranslationContext'
import { useTextSize } from '@/contexts/TextSizeContext'
import { Capacitor } from '@capacitor/core'
import { Printer } from '@capgo/capacitor-printer'
import {
  BIBLE_READER_DEFAULT_MENU_TITLE,
  groupPublicResourceItems,
  publicResourceItemsForResourcesMenu,
  resolveBibleReaderMenuTitle,
} from '@/lib/groupPublicResourceItems'
import { isMcheyneProfileSlug } from '@/lib/mcheyne/mcheyneSlug'
import MemorizeDropdown from '@/components/MemorizeDropdown'
import { OpenBookIcon } from '@/components/OpenBookIcon'
import SunMoonAnimatedIcon from '@/components/SunMoonAnimatedIcon'
import type { MemorizedVerse } from '@/lib/verseMemorizationStorage'
import LastOpenScriptureRowLabel from '@/components/LastOpenScriptureRowLabel'
import { lastOpenScriptureMenuTitle } from '@/lib/lastOpenScriptureLabel'
import {
  buildProfileRecentScriptureHref,
  GOSPEL_PROFILE_LAST_OPEN_CHANGED_EVENT,
  loadProfileRecentResources,
  loadProfileRecentScriptures,
  PROFILE_RECENT_MENU_MAX,
  type ProfileRecentResourceEntry,
  type ProfileRecentScriptureEntry,
} from '@/lib/profileLastOpenResourceStorage'
import {
  loadPublicResourcesMenuItems,
  readPublicResourcesMenuCache,
  shouldLoadPublicResourcesMenu,
} from '@/lib/publicResourcesMenuClient'
import PresentationTocDropdown from '@/components/PresentationTocDropdown'

interface TableOfContentsProps {
  sections: GospelSection[]
  currentProfileSlug?: string
  /** Called when a TOC link is clicked (e.g. to close the side menu) */
  onNavigate?: () => void
  /** When set, Practice opens here so the slide-out can close without unmounting the session (parent portals the modal). */
  onMemorizationPracticeStart?: (verse: MemorizedVerse) => void
  /** Opens the unified study library modal (Resources row type spurgeonLibrary). */
  onOpenSpurgeonLibrary?: (menuTitle?: string) => void
  /** Opens the Morning & Evening devotions picker (Resources row type morningEveningLibrary). */
  onOpenMorneveLibrary?: () => void
  /** Opens the M'Cheyne reading plan calendar (template slug `mchy`). */
  onOpenMcheynePlan?: () => void
  /** Opens the unified study library modal (Resources row type calvinLibrary). */
  onOpenCalvinLibrary?: (menuTitle?: string) => void
  /** Opens the unified study library modal (Resources row type henryLibrary). */
  onOpenHenryLibrary?: (menuTitle?: string) => void
  /** Opens the unified study library modal (Resources row type edwardsLibrary). */
  onOpenEdwardsLibrary?: (menuTitle?: string) => void
  /** Opens the Bible passage picker (main menu, same row style as Text size / Print). */
  onOpenBibleReader?: () => void
}

function resourceTemplateLinkClassName(readComplete: boolean, nested: boolean): string {
  const layout = nested
    ? 'flex items-center gap-2 py-2 pl-8 pr-4 text-sm'
    : 'flex items-center gap-2 px-4 py-3 text-sm'
  const weight = readComplete
    ? 'font-extrabold text-slate-900 dark:text-slate-50'
    : 'font-normal text-slate-700 dark:text-slate-200'
  return `${layout} hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-600 last:border-b-0 transition-colors ${weight}`
}

function ResourceTemplateMenuLink({
  slug,
  title,
  readComplete,
  nested = false,
  onOpenMcheynePlan,
  onNavigate,
}: {
  slug: string
  title: string
  readComplete: boolean
  nested?: boolean
  onOpenMcheynePlan?: () => void
  onNavigate?: () => void
}) {
  const className = resourceTemplateLinkClassName(readComplete, nested)

  if (isMcheyneProfileSlug(slug) && onOpenMcheynePlan) {
    return (
      <button
        type="button"
        data-resource-template-slug={slug}
        onClick={() => {
          onOpenMcheynePlan()
          onNavigate?.()
        }}
        className={`${className} w-full text-left cursor-pointer`}
      >
        <OpenBookIcon />
        <span className="min-w-0">{title}</span>
      </button>
    )
  }

  return (
    <Link
      href={`/${slug}`}
      scroll={false}
      data-resource-template-slug={slug}
      className={className}
    >
      {isMcheyneProfileSlug(slug) ? <OpenBookIcon /> : null}
      <span className="min-w-0">{title}</span>
    </Link>
  )
}

export default function TableOfContents({
  sections,
  currentProfileSlug,
  onNavigate,
  onMemorizationPracticeStart,
  onOpenSpurgeonLibrary,
  onOpenMorneveLibrary,
  onOpenMcheynePlan,
  onOpenCalvinLibrary,
  onOpenHenryLibrary,
  onOpenEdwardsLibrary,
  onOpenBibleReader,
}: TableOfContentsProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [allRecentResources, setAllRecentResources] = useState<ProfileRecentResourceEntry[]>(() =>
    loadProfileRecentResources()
  )
  const [allRecentScriptures, setAllRecentScriptures] = useState<ProfileRecentScriptureEntry[]>(() =>
    loadProfileRecentScriptures()
  )
  const [resourceItems, setResourceItems] = useState<PublicResourceItem[]>(() => {
    return readPublicResourcesMenuCache() ?? []
  })
  const [resourcesRequestDone, setResourcesRequestDone] = useState(
    () => readPublicResourcesMenuCache() != null
  )
  const [isLastOpenOpen, setIsLastOpenOpen] = useState(false)
  const [isResourcesOpen, setIsResourcesOpen] = useState(false)
  const [isTextSizeOpen, setIsTextSizeOpen] = useState(false)
  const [isTranslationOpen, setIsTranslationOpen] = useState(false)
  const { textSize, setTextSize } = useTextSize()
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(new Set())
  const { translation, setTranslation, enabledTranslationOptions } = useTranslation()

  const [readCompleteSlugs, setReadCompleteSlugs] = useState<Set<string>>(() =>
    new Set(loadPresentationReadCompleteSlugs())
  )

  const refreshReadCompleteSlugs = useCallback(() => {
    setReadCompleteSlugs(new Set(loadPresentationReadCompleteSlugs()))
  }, [])

  const recentResources = useMemo(() => {
    const current = currentProfileSlug?.trim() ?? ''
    const filtered = current
      ? allRecentResources.filter((r) => r.slug !== current)
      : allRecentResources
    return filtered.slice(0, PROFILE_RECENT_MENU_MAX)
  }, [allRecentResources, currentProfileSlug])

  const recentScriptures = useMemo(
    () => allRecentScriptures.slice(0, PROFILE_RECENT_MENU_MAX),
    [allRecentScriptures]
  )

  const refreshRecentLastOpen = useCallback(() => {
    setAllRecentResources(loadProfileRecentResources())
    setAllRecentScriptures(loadProfileRecentScriptures())
  }, [])

  useEffect(() => {
    window.addEventListener(GOSPEL_PROFILE_LAST_OPEN_CHANGED_EVENT, refreshRecentLastOpen)
    return () => {
      window.removeEventListener(GOSPEL_PROFILE_LAST_OPEN_CHANGED_EVENT, refreshRecentLastOpen)
    }
  }, [refreshRecentLastOpen])

  useEffect(() => {
    const onStatus = (e: Event) => {
      const ce = e as CustomEvent<{ slug: string; read: boolean }>
      if (!ce.detail?.slug) return
      setReadCompleteSlugs((prev) => {
        const next = new Set(prev)
        if (ce.detail.read) next.add(ce.detail.slug)
        else next.delete(ce.detail.slug)
        return next
      })
    }
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === PRESENTATION_READ_COMPLETE_STORAGE_KEY) refreshReadCompleteSlugs()
    }
    window.addEventListener(GOSPEL_PRESENTATION_READ_STATUS_CHANGED_EVENT, onStatus)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(GOSPEL_PRESENTATION_READ_STATUS_CHANGED_EVENT, onStatus)
      window.removeEventListener('storage', onStorage)
    }
  }, [refreshReadCompleteSlugs])

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
    if (!shouldLoadPublicResourcesMenu(isLoggedIn)) return
    let cancelled = false
    void loadPublicResourcesMenuItems()
      .then((items) => {
        if (!cancelled) setResourceItems(items)
      })
      .catch(() => {
        if (!cancelled) setResourceItems([])
      })
      .finally(() => {
        if (!cancelled) setResourcesRequestDone(true)
      })
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

  const showLastOpenDropdown = recentResources.length > 0 || recentScriptures.length > 0

  const resolvedBibleReaderTitle = useMemo(
    () => resolveBibleReaderMenuTitle(resourceItems),
    [resourceItems]
  )

  /** Show on first paint; hide after public-templates fetch if admin removed Bible Reader from order. */
  const showBibleReaderButton =
    Boolean(onOpenBibleReader) &&
    (!resourcesRequestDone || resolvedBibleReaderTitle !== null)

  const bibleReaderButtonLabel =
    resolvedBibleReaderTitle ?? BIBLE_READER_DEFAULT_MENU_TITLE

  const resourceItemsForMenu = useMemo(
    () => publicResourceItemsForResourcesMenu(resourceItems),
    [resourceItems]
  )

  const resourcesRowClassName =
    'inline-flex items-center w-full px-4 py-3 text-base md:text-lg font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 active:bg-slate-300 dark:active:bg-slate-500 border border-slate-300 dark:border-slate-600 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md min-h-[48px] cursor-pointer'

  const lastOpenSectionLabelClassName =
    'px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-700/80 border-b border-slate-200 dark:border-slate-600'

  return (
    <div className="space-y-4 md:space-y-3">
      {/* History (recent resources) — on web always; on native only when not logged in */}
      {(!isNative || !isLoggedIn) && showLastOpenDropdown ? (
        <div>
          <button
            type="button"
            data-tour="toc-last-open-toggle"
            onClick={() => setIsLastOpenOpen(!isLastOpenOpen)}
            className={resourcesRowClassName}
            aria-expanded={isLastOpenOpen}
            aria-haspopup="listbox"
          >
            <svg
              className="w-5 h-5 mr-2 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            History
            <span className={`ml-auto transition-transform ${isLastOpenOpen ? 'rotate-180' : ''}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </span>
          </button>
          {isLastOpenOpen && (
            <div
              data-tour="toc-last-open-panel"
              className="mt-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 shadow-sm overflow-hidden"
              role="list"
            >
              {recentResources.length > 0 ? (
                <>
                  <p className={lastOpenSectionLabelClassName}>Resources</p>
                  {recentResources.map((entry) => (
                    <Link
                      key={entry.slug}
                      href={`/${entry.slug}`}
                      scroll={false}
                      data-recent-resource-slug={entry.slug}
                      onClick={() => onNavigate?.()}
                      className="flex items-center gap-2 px-4 py-3 text-sm font-normal text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-600 last:border-b-0 transition-colors min-w-0"
                    >
                      <span className="min-w-0 flex-1 truncate" title={entry.title}>
                        {entry.title}
                      </span>
                    </Link>
                  ))}
                </>
              ) : null}
              {recentScriptures.length > 0 ? (
                <>
                  <p className={lastOpenSectionLabelClassName}>Scriptures</p>
                  {recentScriptures.map((entry) => (
                    <Link
                      key={`${entry.slug}|${entry.reference}`}
                      href={buildProfileRecentScriptureHref(entry)}
                      data-recent-scripture-ref={entry.reference}
                      aria-label={lastOpenScriptureMenuTitle(entry.reference, entry.translation)}
                      onClick={() => onNavigate?.()}
                      className="flex items-center gap-2 px-4 py-3 text-sm font-normal text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-600 last:border-b-0 transition-colors min-w-0"
                    >
                      <LastOpenScriptureRowLabel
                        reference={entry.reference}
                        translation={entry.translation}
                      />
                    </Link>
                  ))}
                </>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {/* Resources dropdown — on web always; on native only when not logged in */}
      {(!isNative || !isLoggedIn) && (
        <>
        <div>
          <button
            type="button"
            data-tour="toc-resources-toggle"
            onClick={() => setIsResourcesOpen(!isResourcesOpen)}
            className={resourcesRowClassName}
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
              {!resourcesRequestDone ? (
                <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                  Loading resources…
                </div>
              ) : resourceItemsForMenu.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                  No resources available
                </div>
              ) : (
                groupPublicResourceItems(resourceItemsForMenu).map((group, groupIndex) =>
                  group.kind === 'templates' ? (
                    <div
                      key={`resource-templates-${groupIndex}`}
                      data-resource-templates-block={String(groupIndex)}
                      className="border-b border-slate-100 dark:border-slate-600 last:border-b-0"
                    >
                      {group.items.map((item) => (
                        <ResourceTemplateMenuLink
                          key={item.slug}
                          slug={item.slug}
                          title={item.title}
                          readComplete={readCompleteSlugs.has(item.slug)}
                          onOpenMcheynePlan={onOpenMcheynePlan}
                          onNavigate={onNavigate}
                        />
                      ))}
                    </div>
                  ) : group.kind === 'spurgeonLibrary' ? (
                    <div
                      key={`resource-spurgeon-${groupIndex}`}
                      className="border-b border-slate-100 dark:border-slate-600 last:border-b-0"
                    >
                      <button
                        type="button"
                        data-resource-spurgeon-library
                        data-tour="resource-spurgeon-library"
                        disabled={!onOpenSpurgeonLibrary}
                        onClick={() => {
                          onOpenSpurgeonLibrary?.(group.title)
                          onNavigate?.()
                        }}
                        className="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                          />
                        </svg>
                        <span className="min-w-0">{group.title}</span>
                      </button>
                    </div>
                  ) : group.kind === 'morningEveningLibrary' ? (
                    <div
                      key={`resource-morneve-${groupIndex}`}
                      className="border-b border-slate-100 dark:border-slate-600 last:border-b-0"
                    >
                      <button
                        type="button"
                        data-resource-morneve-library
                        data-tour="resource-morneve-library"
                        disabled={!onOpenMorneveLibrary}
                        onClick={() => {
                          onOpenMorneveLibrary?.()
                          onNavigate?.()
                        }}
                        className="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <SunMoonAnimatedIcon />
                        <span className="min-w-0">{group.title}</span>
                      </button>
                    </div>
                  ) : group.kind === 'calvinLibrary' ? (
                    <div
                      key={`resource-calvin-${groupIndex}`}
                      className="border-b border-slate-100 dark:border-slate-600 last:border-b-0"
                    >
                      <button
                        type="button"
                        data-resource-calvin-library
                        data-tour="resource-calvin-library"
                        disabled={!onOpenCalvinLibrary}
                        onClick={() => {
                          onOpenCalvinLibrary?.(group.title)
                          onNavigate?.()
                        }}
                        className="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                          />
                        </svg>
                        <span className="min-w-0">{group.title}</span>
                      </button>
                    </div>
                  ) : group.kind === 'henryLibrary' ? (
                    <div
                      key={`resource-henry-${groupIndex}`}
                      className="border-b border-slate-100 dark:border-slate-600 last:border-b-0"
                    >
                      <button
                        type="button"
                        data-resource-henry-library
                        data-tour="resource-henry-library"
                        disabled={!onOpenHenryLibrary}
                        onClick={() => {
                          onOpenHenryLibrary?.(group.title)
                          onNavigate?.()
                        }}
                        className="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                          />
                        </svg>
                        <span className="min-w-0">{group.title}</span>
                      </button>
                    </div>
                  ) : group.kind === 'edwardsLibrary' ? (
                    <div
                      key={`resource-edwards-${groupIndex}`}
                      className="border-b border-slate-100 dark:border-slate-600 last:border-b-0"
                    >
                      <button
                        type="button"
                        data-resource-edwards-library
                        data-tour="resource-edwards-library"
                        disabled={!onOpenEdwardsLibrary}
                        onClick={() => {
                          onOpenEdwardsLibrary?.(group.title)
                          onNavigate?.()
                        }}
                        className="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                          />
                        </svg>
                        <span className="min-w-0">{group.title}</span>
                      </button>
                    </div>
                  ) : group.kind === 'category' ? (
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
                      {expandedCategoryIds.has(group.item.id) && group.item.children.length > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-700/50">
                          {group.item.children.map((child, childIdx) =>
                            child.type === 'template' ? (
                              <ResourceTemplateMenuLink
                                key={`${group.item.id}-t-${child.slug}`}
                                slug={child.slug}
                                title={child.title}
                                readComplete={readCompleteSlugs.has(child.slug)}
                                nested
                                onOpenMcheynePlan={onOpenMcheynePlan}
                                onNavigate={onNavigate}
                              />
                            ) : child.type === 'spurgeonLibrary' ? (
                              <button
                                key={`${group.item.id}-sg-${childIdx}`}
                                type="button"
                                data-resource-spurgeon-library
                                disabled={!onOpenSpurgeonLibrary}
                                onClick={() => {
                                  onOpenSpurgeonLibrary?.(child.title)
                                  onNavigate?.()
                                }}
                                className="flex w-full cursor-pointer items-center gap-2 py-2 pl-8 pr-4 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-600 last:border-b-0 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {child.title}
                              </button>
                            ) : child.type === 'morningEveningLibrary' ? (
                              <button
                                key={`${group.item.id}-me-${childIdx}`}
                                type="button"
                                data-resource-morneve-library
                                disabled={!onOpenMorneveLibrary}
                                onClick={() => {
                                  onOpenMorneveLibrary?.()
                                  onNavigate?.()
                                }}
                                className="flex w-full cursor-pointer items-center gap-2 py-2 pl-8 pr-4 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-600 last:border-b-0 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {child.title}
                              </button>
                            ) : child.type === 'edwardsLibrary' ? (
                              <button
                                key={`${group.item.id}-je-${childIdx}`}
                                type="button"
                                data-resource-edwards-library
                                disabled={!onOpenEdwardsLibrary}
                                onClick={() => {
                                  onOpenEdwardsLibrary?.(child.title)
                                  onNavigate?.()
                                }}
                                className="flex w-full cursor-pointer items-center gap-2 py-2 pl-8 pr-4 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-600 last:border-b-0 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {child.title}
                              </button>
                            ) : child.type === 'henryLibrary' ? (
                              <button
                                key={`${group.item.id}-mh-${childIdx}`}
                                type="button"
                                data-resource-henry-library
                                disabled={!onOpenHenryLibrary}
                                onClick={() => {
                                  onOpenHenryLibrary?.(child.title)
                                  onNavigate?.()
                                }}
                                className="flex w-full cursor-pointer items-center gap-2 py-2 pl-8 pr-4 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-600 last:border-b-0 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {child.title}
                              </button>
                            ) : child.type === 'calvinLibrary' ? (
                              <button
                                key={`${group.item.id}-cv-${childIdx}`}
                                type="button"
                                data-resource-calvin-library
                                disabled={!onOpenCalvinLibrary}
                                onClick={() => {
                                  onOpenCalvinLibrary?.(child.title)
                                  onNavigate?.()
                                }}
                                className="flex w-full cursor-pointer items-center gap-2 py-2 pl-8 pr-4 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-600 last:border-b-0 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {child.title}
                              </button>
                            ) : null
                          )}
                        </div>
                      )}
                    </div>
                  ) : null
                )
              )}
            </div>
          )}
        </div>
        </>
      )}

      {showBibleReaderButton ? (
        <button
          type="button"
          data-tour="toc-bible-reader"
          data-resource-bible-reader
          onClick={() => {
            onOpenBibleReader?.()
            onNavigate?.()
          }}
          className={resourcesRowClassName}
        >
          <svg className="w-5 h-5 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <span className="min-w-0 truncate text-left">{bibleReaderButtonLabel}</span>
        </button>
      ) : null}

      {/* Bible Translation — same button + listbox panel as Text size (OS select menus cannot be themed) */}
      <div data-tour="toc-bible-translation">
        <button
          type="button"
          id="bible-translation"
          data-tour="toc-bible-translation-toggle"
          onClick={() => setIsTranslationOpen(!isTranslationOpen)}
          className={resourcesRowClassName}
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

      {/* Text size dropdown — same design as Resources */}
      <div>
        <button
          type="button"
          data-tour="toc-text-size-toggle"
          onClick={() => setIsTextSizeOpen(!isTextSizeOpen)}
          className={resourcesRowClassName}
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

      <button
        type="button"
        data-tour="toc-print-version"
        onClick={handlePrint}
        className={resourcesRowClassName}
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        Print Version
      </button>
      <PresentationTocDropdown
        sections={sections}
        rowClassName={resourcesRowClassName}
        onNavigate={onNavigate}
      />
    </div>
  )
}