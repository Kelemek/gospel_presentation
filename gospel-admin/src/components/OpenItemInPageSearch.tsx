'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { runBiblicalCounselingResourceSearch } from '@/lib/biblicalCounseling/biblicalCounselingResourceSearch'
import type { BiblicalCounselingSearchMappingHint } from '@/lib/biblicalCounseling/biblicalCounselingResourceSearch'
import { isBiblicalCounselingSecularMapProfile } from '@/lib/biblicalCounseling/biblicalCounselingReference'
import { useSecularTermMap } from '@/hooks/useSecularTermMap'
import { isProfileResourceSearchContentTouchBlurHost } from '@/lib/memorizationViewportPlatform'
import {
  RESOURCE_SEARCH_INPUT_ARIA_LABEL,
} from '@/lib/profileResourceInPageSearch'

const IN_PAGE_SEARCH_DEBOUNCE_MS = 250
const IN_PAGE_SEARCH_MIN_LENGTH = 3

export type OpenItemInPageSearchProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  contentRootRef: RefObject<HTMLElement | null>
  /** When true, skip running search (e.g. scripture modal open on profile page). */
  searchPaused?: boolean
  onActiveMatchChange?: (activeIndex: number, matchCount: number) => void
  ariaLabel: string
  placeholder: string
  scrollMode?: 'window' | 'container'
  /** Profile slug for secular→biblical mapping search on the counseling reference. */
  profileSlug?: string
}

export default function OpenItemInPageSearch({
  open,
  onOpenChange,
  contentRootRef,
  searchPaused = false,
  onActiveMatchChange,
  ariaLabel,
  placeholder,
  scrollMode = 'window',
  profileSlug,
}: OpenItemInPageSearchProps) {
  const secularMapEnabled = isBiblicalCounselingSecularMapProfile(profileSlug)
  const secularTermMap = useSecularTermMap(secularMapEnabled)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [matchCount, setMatchCount] = useState(0)
  const [activeIndex, setActiveIndex] = useState(0)
  const [mappingHint, setMappingHint] = useState<BiblicalCounselingSearchMappingHint | null>(null)
  const searchHandleRef = useRef<ReturnType<typeof runBiblicalCounselingResourceSearch> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const id = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => window.cancelAnimationFrame(id)
  }, [open])

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query)
    }, IN_PAGE_SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [open, query])

  /** Mobile: dismiss the keyboard when the reader touches article content (panel stays open). */
  useEffect(() => {
    if (!open || !isProfileResourceSearchContentTouchBlurHost()) return
    const scope = contentRootRef.current
    if (!scope) return

    const onTouchStart = (event: TouchEvent) => {
      const input = inputRef.current
      if (!input || document.activeElement !== input) return
      const target = event.target
      if (!(target instanceof Node) || input.contains(target)) return
      input.blur()
    }

    scope.addEventListener('touchstart', onTouchStart, { passive: true })
    return () => scope.removeEventListener('touchstart', onTouchStart)
  }, [open, contentRootRef])

  const clearSearchDom = useCallback(() => {
    searchHandleRef.current?.clear()
    searchHandleRef.current = null
  }, [])

  useEffect(() => {
    if (!open) {
      clearSearchDom()
      return
    }
    if (searchPaused) {
      clearSearchDom()
      return
    }

    const scope = contentRootRef.current
    const trimmedDebounced = debouncedQuery.trim()
    const searchQuery =
      trimmedDebounced.length >= IN_PAGE_SEARCH_MIN_LENGTH ? debouncedQuery : ''

    let scroll: { mode: 'window' } | { mode: 'container'; scrollContainer: HTMLElement } = {
      mode: 'window',
    }
    if (scrollMode === 'container' && scope) {
      scroll = { mode: 'container', scrollContainer: scope }
    }

    const handle = runBiblicalCounselingResourceSearch(scope, searchQuery, profileSlug, {
      activeIndex: 0,
      scroll,
      secularTermMap: secularMapEnabled ? secularTermMap : undefined,
    })
    searchHandleRef.current = handle
    setMatchCount(handle.count)
    setActiveIndex(0)
    setMappingHint(handle.mappingHint)
    onActiveMatchChange?.(0, handle.count)

    return () => {
      handle.clear()
    }
  }, [
    open,
    debouncedQuery,
    contentRootRef,
    searchPaused,
    clearSearchDom,
    onActiveMatchChange,
    scrollMode,
    profileSlug,
    secularMapEnabled,
    secularTermMap,
  ])

  const goToMatch = useCallback(
    (nextIndex: number) => {
      const handle = searchHandleRef.current
      if (!handle || handle.count === 0) return
      const clamped =
        ((nextIndex % handle.count) + handle.count) % handle.count
      handle.scrollToIndex(clamped)
      setActiveIndex(clamped)
      onActiveMatchChange?.(clamped, handle.count)
    },
    [onActiveMatchChange]
  )

  const trimmedDebounced = debouncedQuery.trim()
  const countLabel = !open
    ? ''
    : trimmedDebounced.length < IN_PAGE_SEARCH_MIN_LENGTH
      ? ''
      : matchCount === 0
        ? 'No matches'
        : `${activeIndex + 1} of ${matchCount}`

  return (
    <div
      className={`print-hide overflow-hidden border-t border-slate-200 bg-white transition-[max-height,opacity] duration-200 ease-out motion-reduce:transition-none dark:border-slate-600 dark:bg-slate-800 ${
        open ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'
      }`}
      aria-hidden={!open}
    >
      <div className="flex items-center gap-2 px-3 py-2 md:px-4">
        <input
          ref={inputRef}
          type="text"
          role="searchbox"
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              onOpenChange(false)
            } else if (e.key === 'Enter') {
              e.preventDefault()
              if (e.shiftKey) goToMatch(activeIndex - 1)
              else goToMatch(activeIndex + 1)
            }
          }}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-500 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
          disabled={!open}
        />
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {countLabel}
        </span>
        <span
          className="shrink-0 text-xs tabular-nums text-slate-600 dark:text-slate-300"
          aria-hidden
        >
          {countLabel}
        </span>
        <button
          type="button"
          aria-label="Previous match"
          title="Previous match"
          disabled={matchCount === 0}
          onClick={() => goToMatch(activeIndex - 1)}
          className="flex shrink-0 items-center justify-center rounded-md p-2 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Next match"
          title="Next match"
          disabled={matchCount === 0}
          onClick={() => goToMatch(activeIndex + 1)}
          className="flex shrink-0 items-center justify-center rounded-md p-2 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      {mappingHint ? (
        <p className="border-t border-slate-100 px-3 pb-2 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300 md:px-4">
          Secular term →{' '}
          <span className="font-medium text-slate-800 dark:text-slate-100">
            {mappingHint.biblicalTopic}
          </span>
        </p>
      ) : null}
    </div>
  )
}

export { RESOURCE_SEARCH_INPUT_ARIA_LABEL }
