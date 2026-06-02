'use client'

import { forwardRef, useCallback, useLayoutEffect, useRef, useState } from 'react'

const TAB_TITLE_TRUNCATION_SUFFIX = '..'

const TabTruncatedTitle = forwardRef<HTMLSpanElement, { title: string }>(function TabTruncatedTitle(
  { title },
  forwardedRef
) {
  const measureRef = useRef<HTMLSpanElement>(null)
  const [displayTitle, setDisplayTitle] = useState(title)

  useLayoutEffect(() => {
    const el = measureRef.current
    if (!el) return

    const fitTitle = () => {
      const width = el.clientWidth
      if (width <= 0) {
        setDisplayTitle(title)
        return
      }

      el.textContent = title
      if (el.scrollWidth <= width) {
        setDisplayTitle(title)
        return
      }

      let truncated = title
      while (truncated.length > 0) {
        const candidate = `${truncated}${TAB_TITLE_TRUNCATION_SUFFIX}`
        el.textContent = candidate
        if (el.scrollWidth <= width) {
          setDisplayTitle(candidate)
          return
        }
        truncated = truncated.slice(0, -1)
      }

      setDisplayTitle(TAB_TITLE_TRUNCATION_SUFFIX)
    }

    fitTitle()
    const observer = new ResizeObserver(fitTitle)
    observer.observe(el)
    return () => observer.disconnect()
  }, [title])

  const setRefs = useCallback(
    (node: HTMLSpanElement | null) => {
      measureRef.current = node
      if (typeof forwardedRef === 'function') forwardedRef(node)
      else if (forwardedRef) forwardedRef.current = node
    },
    [forwardedRef]
  )

  return (
    <span
      ref={setRefs}
      className="block min-w-0 max-w-full overflow-hidden whitespace-nowrap text-left"
    >
      {displayTitle}
    </span>
  )
})

export type OpenItemTab = {
  id: string
  title: string
  ariaLabel?: string
  /** When set, only `book` truncates; `suffix` (e.g. chapter:verse) stays visible. */
  titleParts?: { book: string; suffix: string }
}

function TabScriptureStyleTitle({ book, suffix }: { book: string; suffix: string }) {
  if (!suffix) {
    return (
      <span className="block min-w-0 max-w-full truncate whitespace-nowrap text-left">{book}</span>
    )
  }
  return (
    <span className="flex min-w-0 max-w-full items-baseline gap-x-1 overflow-hidden whitespace-nowrap text-left">
      <span className="min-w-0 truncate">{book}</span>
      <span className="shrink-0 whitespace-nowrap">{suffix}</span>
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
  if (tabs.length <= 1) return null

  const active = activeId.trim()

  return (
    <div
      {...(dataTour ? { 'data-tour': dataTour } : {})}
      className={`w-full min-w-0 border-t border-slate-200 dark:border-slate-600 overflow-hidden ${className}`.trim()}
    >
      <div role="tablist" aria-label={tablistAriaLabel} className="bg-slate-100/80 dark:bg-slate-700/80">
        <div className="flex w-full min-w-0">
          {tabs.map((entry) => {
            const isActive = entry.id === active
            const label = entry.ariaLabel ?? entry.title
            return (
              <div
                key={entry.id}
                role="presentation"
                className={`flex min-w-0 flex-1 items-stretch overflow-hidden rounded-t-md border-r border-slate-200 dark:border-slate-600 last:border-r-0 ${
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
                  className={`flex min-w-0 flex-1 items-center pl-2 pr-0 py-2 text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'text-slate-900 dark:text-slate-100'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    {entry.titleParts ? (
                      <TabScriptureStyleTitle
                        book={entry.titleParts.book}
                        suffix={entry.titleParts.suffix}
                      />
                    ) : (
                      <TabTruncatedTitle title={entry.title} />
                    )}
                  </div>
                </button>
                <button
                  type="button"
                  aria-label={`Close ${label}`}
                  title={`Close ${label}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onCloseTab(entry.id)
                  }}
                  className="flex w-7 shrink-0 items-center justify-center pr-0.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/80 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
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
