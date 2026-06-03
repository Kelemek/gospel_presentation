'use client'

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import {
  captureOpenItemTabBarScroll,
  loadOpenItemTabBarScrollLeft,
  persistOpenItemTabBarScrollOnRelease,
  restoreOpenItemTabBarScrollPosition,
  saveOpenItemTabBarScrollLeft,
  scrollOpenItemTabIntoView,
} from '@/lib/openItemTabBarScrollStorage'

const TABLIST_SCROLL_CLASS =
  'bg-slate-100/80 dark:bg-slate-700/80 overflow-x-auto overscroll-x-contain touch-pan-x [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'

/** ~44px min touch height on small screens; compact on md+ */
const TAB_SELECT_BUTTON_CLASS =
  'flex shrink-0 touch-pan-x items-center pl-4 pr-2 py-3 min-h-11 text-sm font-medium transition-colors cursor-pointer md:pl-3 md:pr-1.5 md:py-2 md:min-h-0'

const TAB_CLOSE_BUTTON_CLASS =
  'flex shrink-0 touch-pan-x items-center justify-center min-h-11 min-w-11 w-11 pr-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200/80 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer md:min-h-0 md:min-w-0 md:w-7 md:pr-0.5'

const TAB_CLOSE_ICON_CLASS = 'h-5 w-5 md:h-4 md:w-4'

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
  /** When set, horizontal scroll position is restored after remount (e.g. resource tab navigation). */
  persistScrollKey?: string
  /** When set (once per new tab), scroll this tab fully into view including its close control. */
  revealTabId?: string | null
}

export default function OpenItemTabBar({
  tabs,
  activeId,
  onSelectTab,
  onCloseTab,
  tablistAriaLabel,
  dataTour,
  className = '',
  persistScrollKey,
  revealTabId,
}: OpenItemTabBarProps) {
  const active = activeId.trim()
  const tablistScrollRef = useRef<HTMLDivElement>(null)

  const captureTabBarScroll = useCallback(() => {
    if (!persistScrollKey) return
    captureOpenItemTabBarScroll(persistScrollKey, tablistScrollRef.current)
  }, [persistScrollKey])

  useLayoutEffect(() => {
    const revealId = revealTabId?.trim()
    if (revealId && revealId === active) {
      let cancelled = false
      let attempts = 0
      const maxAttempts = 8

      const applyReveal = () => {
        if (cancelled) return
        const el = tablistScrollRef.current
        if (!el) return
        const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth)
        if (maxScroll <= 0 && attempts < maxAttempts) {
          attempts += 1
          window.requestAnimationFrame(applyReveal)
          return
        }
        scrollOpenItemTabIntoView(el, revealId, persistScrollKey)
      }

      applyReveal()
      return () => {
        cancelled = true
      }
    }

    if (!persistScrollKey) return
    const saved = loadOpenItemTabBarScrollLeft(persistScrollKey)
    if (saved == null) return

    let cancelled = false
    let attempts = 0
    const maxAttempts = 8

    const applyRestore = () => {
      if (cancelled) return
      const el = tablistScrollRef.current
      if (!el) return
      const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth)
      if (maxScroll <= 0 && saved > 0 && attempts < maxAttempts) {
        attempts += 1
        window.requestAnimationFrame(applyRestore)
        return
      }
      restoreOpenItemTabBarScrollPosition(el, persistScrollKey)
    }

    applyRestore()
    return () => {
      cancelled = true
    }
  }, [persistScrollKey, revealTabId, active, tabs.length])

  useEffect(() => {
    if (!persistScrollKey) return
    const el = tablistScrollRef.current
    if (!el) return

    const saveOnScroll = () => saveOpenItemTabBarScrollLeft(persistScrollKey, el.scrollLeft)
    el.addEventListener('scroll', saveOnScroll, { passive: true })
    return () => {
      persistOpenItemTabBarScrollOnRelease(persistScrollKey, el)
      el.removeEventListener('scroll', saveOnScroll)
    }
  }, [persistScrollKey])

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
                data-open-item-tab-id={entry.id}
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
                  onPointerDown={captureTabBarScroll}
                  onClick={() => onSelectTab(entry.id)}
                  className={`${TAB_SELECT_BUTTON_CLASS} ${
                    isActive
                      ? 'text-slate-900 dark:text-slate-100'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span className="inline-flex min-w-0">
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
                  onPointerDown={captureTabBarScroll}
                  onClick={(e) => {
                    e.stopPropagation()
                    captureTabBarScroll()
                    onCloseTab(entry.id)
                  }}
                  className={TAB_CLOSE_BUTTON_CLASS}
                >
                  <svg
                    className={TAB_CLOSE_ICON_CLASS}
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
