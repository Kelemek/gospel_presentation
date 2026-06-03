'use client'

import { useCallback, useLayoutEffect, useRef } from 'react'

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const TABLIST_SCROLL_CLASS =
  'bg-slate-100/80 dark:bg-slate-700/80 overflow-x-auto overscroll-x-contain touch-pan-x [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'

export type OpenItemTab = {
  id: string
  title: string
  ariaLabel?: string
  /** When set, book and chapter:verse render as separate nodes (full text, horizontal scroll). */
  titleParts?: { book: string; suffix: string }
}

function TabScriptureStyleTitle({ book, suffix }: { book: string; suffix: string }) {
  if (!suffix) {
    return <span className="whitespace-nowrap text-left">{book}</span>
  }
  return (
    <span className="flex shrink-0 items-baseline gap-x-1 whitespace-nowrap text-left">
      <span>{book}</span>
      <span>{suffix}</span>
    </span>
  )
}

export type OpenItemTabBarProps = {
  tabs: OpenItemTab[]
  activeId: string
  onSelectTab: (id: string) => void
  onCloseTab: (id: string) => void
  tablistAriaLabel: string
  dataTour?: string
  className?: string
}

export default function OpenItemTabBar({
  tabs,
  activeId,
  onSelectTab,
  onCloseTab,
  tablistAriaLabel,
  dataTour,
  className = '',
}: OpenItemTabBarProps) {
  const active = activeId.trim()

  const tabLabelRefs = useRef<Map<string, HTMLSpanElement>>(new Map())
  const tablistScrollRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const labelEl = tabLabelRefs.current.get(active)
    const scrollEl = tablistScrollRef.current
    if (!labelEl || !scrollEl) return
    labelEl.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'nearest',
    })
  }, [active, tabs])

  const setTabLabelRef = useCallback((id: string, node: HTMLSpanElement | null) => {
    if (node) tabLabelRefs.current.set(id, node)
    else tabLabelRefs.current.delete(id)
  }, [])

  if (tabs.length <= 1) return null

  return (
    <div
      {...(dataTour ? { 'data-tour': dataTour } : {})}
      className={`w-full min-w-0 border-t border-slate-200 dark:border-slate-600 overflow-hidden ${className}`.trim()}
    >
      <div
        ref={tablistScrollRef}
        role="tablist"
        aria-label={tablistAriaLabel}
        className={TABLIST_SCROLL_CLASS}
      >
        <div className="flex w-max min-w-full flex-nowrap">
          {tabs.map((entry) => {
            const isActive = entry.id === active
            const label = entry.ariaLabel ?? entry.title
            return (
              <div
                key={entry.id}
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
                  aria-label={label}
                  title={label}
                  onClick={() => onSelectTab(entry.id)}
                  className={`flex shrink-0 touch-pan-x items-center px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'text-slate-900 dark:text-slate-100'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span
                    ref={(node) => setTabLabelRef(entry.id, node)}
                    className="inline-flex min-w-0"
                  >
                    {entry.titleParts ? (
                      <TabScriptureStyleTitle
                        book={entry.titleParts.book}
                        suffix={entry.titleParts.suffix}
                      />
                    ) : (
                      <span className="whitespace-nowrap text-left">{entry.title}</span>
                    )}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Close ${label}`}
                  title={`Close ${label}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onCloseTab(entry.id)
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
