'use client'

import { useCallback, useLayoutEffect, useRef } from 'react'
import type { ProfileRecentResourceEntry } from '@/lib/profileLastOpenResourceStorage'

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export type ProfileResourceTabsProps = {
  tabs: ProfileRecentResourceEntry[]
  activeSlug: string
  onSelectTab: (slug: string) => void
  onCloseTab: (slug: string) => void
}

export default function ProfileResourceTabs({
  tabs,
  activeSlug,
  onSelectTab,
  onCloseTab,
}: ProfileResourceTabsProps) {
  const active = activeSlug.trim()

  const tabTitleRefs = useRef<Map<string, HTMLSpanElement>>(new Map())
  const tablistScrollRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const titleEl = tabTitleRefs.current.get(active)
    const scrollEl = tablistScrollRef.current
    if (!titleEl || !scrollEl) return
    titleEl.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'nearest',
    })
  }, [active, tabs])

  const setTabTitleRef = useCallback((slug: string, node: HTMLSpanElement | null) => {
    if (node) tabTitleRefs.current.set(slug, node)
    else tabTitleRefs.current.delete(slug)
  }, [])

  if (tabs.length <= 1) return null

  return (
    <div
      data-tour="profile-resource-tabs"
      className="w-full min-w-0 border-t border-slate-200 dark:border-slate-600 overflow-hidden"
    >
      <div
        ref={tablistScrollRef}
        role="tablist"
        aria-label="Open resources"
        className="bg-slate-100/80 dark:bg-slate-700/80 overflow-x-auto overscroll-x-contain touch-pan-x [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex w-max min-w-full flex-nowrap">
          {tabs.map((entry) => {
            const isActive = entry.slug === active
            return (
              <div
                key={entry.slug}
                role="presentation"
                className={`flex shrink-0 items-stretch rounded-t-md border-r border-slate-200 dark:border-slate-600 last:border-r-0 ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 shadow-sm'
                    : 'bg-transparent hover:bg-slate-50/80 dark:hover:bg-slate-600/50'
                }`}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={entry.title}
                  title={entry.title}
                  onClick={() => onSelectTab(entry.slug)}
                  className={`flex shrink-0 touch-pan-x items-center px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'text-slate-900 dark:text-slate-100'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span
                    ref={(node) => setTabTitleRef(entry.slug, node)}
                    className="whitespace-nowrap text-left"
                  >
                    {entry.title}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Close ${entry.title}`}
                  title={`Close ${entry.title}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onCloseTab(entry.slug)
                  }}
                  className="flex w-7 shrink-0 touch-pan-x items-center justify-center pr-0.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/80 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
