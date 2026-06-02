'use client'

import { createPortal } from 'react-dom'
import {
  forwardRef,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import type { ProfileRecentResourceEntry } from '@/lib/profileLastOpenResourceStorage'

const TAB_TITLE_TRUNCATION_SUFFIX = '..'
const MOBILE_TABS_MAX_WIDTH = '(max-width: 639px)'
const TITLE_FLYOVER_MS = 280

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function isMobileTabsLayout(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(MOBILE_TABS_MAX_WIDTH).matches
}

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

type TitleFlyover = {
  id: number
  title: string
  from: DOMRect
  to: DOMRect
}

function TitleFlyoverLayer({
  flyover,
  onComplete,
}: {
  flyover: TitleFlyover
  onComplete: () => void
}) {
  const nodeRef = useRef<HTMLDivElement>(null)
  const completedRef = useRef(false)

  useLayoutEffect(() => {
    const node = nodeRef.current
    if (!node) return

    const { from, to } = flyover
    const dx = from.left - to.left
    const dy = from.top - to.top
    const sx = from.width / Math.max(to.width, 1)
    const sy = from.height / Math.max(to.height, 1)

    node.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`

    const finish = () => {
      if (completedRef.current) return
      completedRef.current = true
      onComplete()
    }

    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.target !== node || event.propertyName !== 'transform') return
      finish()
    }

    node.addEventListener('transitionend', onTransitionEnd)
    const timeoutId = window.setTimeout(finish, TITLE_FLYOVER_MS + 80)

    const frame = requestAnimationFrame(() => {
      node.style.transition = `transform ${TITLE_FLYOVER_MS}ms ease-out`
      node.style.transform = 'translate(0, 0) scale(1, 1)'
    })

    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(timeoutId)
      node.removeEventListener('transitionend', onTransitionEnd)
    }
  }, [flyover, onComplete])

  const { to, title } = flyover

  return createPortal(
    <div
      ref={nodeRef}
      data-testid="profile-resource-tabs-title-flyover"
      aria-hidden
      className="pointer-events-none fixed z-45 overflow-hidden text-sm font-medium text-slate-800 dark:text-slate-100"
      style={{
        left: to.left,
        top: to.top,
        width: to.width,
        height: to.height,
        transformOrigin: 'top left',
      }}
    >
      <p className="truncate px-3 text-center leading-5">{title}</p>
    </div>,
    document.body
  )
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
  const activeTitle = tabs.find((entry) => entry.slug === active)?.title ?? active

  const [titleFlyover, setTitleFlyover] = useState<TitleFlyover | null>(null)
  const [subtitleHidden, setSubtitleHidden] = useState(false)

  const prevActiveSlugRef = useRef<string | null>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const tabTitleRefs = useRef<Map<string, HTMLSpanElement>>(new Map())

  const clearTitleFlyover = useCallback(() => {
    setTitleFlyover(null)
    setSubtitleHidden(false)
  }, [])

  useLayoutEffect(() => {
    const prev = prevActiveSlugRef.current
    prevActiveSlugRef.current = active

    if (prev === null || prev === active) return
    if (!isMobileTabsLayout() || prefersReducedMotion()) return

    const fromEl = tabTitleRefs.current.get(active)
    const toEl = subtitleRef.current
    if (!fromEl || !toEl) return

    const from = fromEl.getBoundingClientRect()
    const to = toEl.getBoundingClientRect()
    if (from.width <= 0 || to.width <= 0) return

    setSubtitleHidden(true)
    setTitleFlyover({
      id: Date.now(),
      title: activeTitle,
      from,
      to,
    })
  }, [active, activeTitle])

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
        role="tablist"
        aria-label="Open resources"
        className="bg-slate-100/80 dark:bg-slate-700/80"
      >
        <div className="flex w-full min-w-0">
          {tabs.map((entry) => {
            const isActive = entry.slug === active
            return (
              <div
                key={entry.slug}
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
                  aria-label={entry.title}
                  title={entry.title}
                  onClick={() => onSelectTab(entry.slug)}
                  className={`flex min-w-0 flex-1 items-center pl-2 pr-0 py-2 text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'text-slate-900 dark:text-slate-100'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <TabTruncatedTitle
                      ref={(node) => setTabTitleRef(entry.slug, node)}
                      title={entry.title}
                    />
                  </div>
                </button>
                <button
                  type="button"
                  aria-label={`Close ${entry.title}`}
                  title={`Close ${entry.title}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onCloseTab(entry.slug)
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
      <p
        ref={subtitleRef}
        data-testid="profile-resource-tabs-active-title"
        className={`sm:hidden px-3 py-1.5 text-center text-sm font-medium text-slate-800 dark:text-slate-100 truncate bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-600 transition-opacity duration-200 ${
          subtitleHidden ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {activeTitle}
      </p>
      {titleFlyover ? (
        <TitleFlyoverLayer key={titleFlyover.id} flyover={titleFlyover} onComplete={clearTitleFlyover} />
      ) : null}
    </div>
  )
}
