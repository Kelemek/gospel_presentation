'use client'

import type { CSSProperties } from 'react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import type { GospelSection } from '@/lib/types'
import { scrollToTocAnchor } from '@/lib/scrollToTocAnchor'
import {
  getCurrentTocAnchorId,
  getLocationLabel,
} from '@/lib/tocAnchorFromScroll'
import {
  addBookmark,
  loadBookmarks,
  removeBookmark,
  type ProfileBookmark,
} from '@/lib/profileBookmarksStorage'
import { GOSPEL_CLOSE_BOOKMARKS_PANEL_EVENT } from '@/lib/bookmarksPanelCloseEvent'
import { useAlertModal } from '@/contexts/AlertModalContext'

const BOOKMARK_SEARCH_DEBOUNCE_MS = 250

function bookmarkMatchesSearch(b: ProfileBookmark, trimmedLowerNeedle: string): boolean {
  if (!trimmedLowerNeedle) return true
  const parts = [b.resourceTitle, b.locationLabel, b.slug, b.anchorId]
  return parts.some((t) => t.toLowerCase().includes(trimmedLowerNeedle))
}

const TRIGGER_CLASS =
  'p-2 rounded-md flex items-center justify-center min-h-[36px] min-w-[36px] bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-700 dark:active:bg-slate-800 dark:text-white transition-colors cursor-pointer'

const PANEL_MARGIN = 8
/** Below this width (Tailwind `md`), center the panel horizontally on the screen. */
const BOOKMARKS_PANEL_CENTER_BELOW_PX = 768

/** Panel sits just below the trigger. On mobile, centered horizontally; on md+, right edge aligns with the trigger. */
export function bookmarksPanelStyleFromTrigger(rect: DOMRectReadOnly): CSSProperties {
  const vw = window.innerWidth
  const maxPreferred = Math.min(320, vw - 2 * PANEL_MARGIN)
  const top = rect.bottom + PANEL_MARGIN
  const maxHeight = 'min(70vh, 480px)'

  if (vw < BOOKMARKS_PANEL_CENTER_BELOW_PX) {
    const width = maxPreferred
    const left = Math.max(PANEL_MARGIN, (vw - width) / 2)
    return {
      position: 'fixed',
      zIndex: 60,
      top,
      left,
      width,
      maxHeight,
      right: 'auto',
    }
  }

  let width = maxPreferred
  let left = rect.right - width
  if (left < PANEL_MARGIN) {
    width = Math.min(maxPreferred, Math.max(0, rect.right - PANEL_MARGIN))
    left = PANEL_MARGIN
  }
  return {
    position: 'fixed',
    zIndex: 60,
    top,
    left,
    width,
    maxHeight,
    right: 'auto',
  }
}

interface BookmarksDropdownProps {
  sections: GospelSection[]
  profileTitle: string
  profileSlug: string
}

export default function BookmarksDropdown({
  sections,
  profileTitle,
  profileSlug,
}: BookmarksDropdownProps) {
  const router = useRouter()
  const { showConfirm } = useAlertModal()
  const [open, setOpen] = useState(false)
  const [bookmarks, setBookmarks] = useState<ProfileBookmark[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [addHint, setAddHint] = useState<string | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({})

  const refreshList = useCallback(() => {
    setBookmarks(loadBookmarks())
  }, [])

  const resetSearch = useCallback(() => {
    setSearchInput('')
    setDebouncedSearch('')
  }, [])

  const closeDropdown = useCallback(() => {
    resetSearch()
    setOpen(false)
  }, [resetSearch])

  const positionPanel = useCallback(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setPanelStyle(bookmarksPanelStyleFromTrigger(rect))
  }, [open])

  useLayoutEffect(() => {
    if (!open) return
    positionPanel()
    const raf = requestAnimationFrame(() => positionPanel())
    window.addEventListener('scroll', positionPanel, true)
    window.addEventListener('resize', positionPanel)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', positionPanel, true)
      window.removeEventListener('resize', positionPanel)
    }
  }, [open, positionPanel])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return
      closeDropdown()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, closeDropdown])

  useEffect(() => {
    const onTourClose = (): void => {
      closeDropdown()
    }
    window.addEventListener(GOSPEL_CLOSE_BOOKMARKS_PANEL_EVENT, onTourClose)
    return () => window.removeEventListener(GOSPEL_CLOSE_BOOKMARKS_PANEL_EVENT, onTourClose)
  }, [closeDropdown])

  useEffect(() => {
    if (!addHint) return
    const t = window.setTimeout(() => setAddHint(null), 2500)
    return () => window.clearTimeout(t)
  }, [addHint])

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim().toLowerCase())
    }, BOOKMARK_SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [searchInput])

  const filteredBookmarks = debouncedSearch
    ? bookmarks.filter((b) => bookmarkMatchesSearch(b, debouncedSearch))
    : bookmarks

  const handleAdd = () => {
    const anchorId = getCurrentTocAnchorId(sections)
    if (!anchorId) {
      setAddHint('Could not detect position')
      return
    }
    const locationLabel = getLocationLabel(sections, anchorId)
    const ok = addBookmark({
      slug: profileSlug,
      resourceTitle: profileTitle,
      anchorId,
      locationLabel,
    })
    if (!ok) {
      setAddHint('Already saved')
      return
    }
    setAddHint(null)
    refreshList()
  }

  const handleRemove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const confirmed = await showConfirm('Remove this bookmark?')
    if (confirmed) {
      removeBookmark(id)
      refreshList()
    }
  }

  const handleOpenBookmark = (b: ProfileBookmark) => {
    closeDropdown()
    if (b.slug === profileSlug) {
      scrollToTocAnchor(b.anchorId)
      return
    }
    router.push(`/${b.slug}#${encodeURIComponent(b.anchorId)}`)
  }

  return (
    <div className="relative print-hide">
      <button
        ref={triggerRef}
        type="button"
        data-tour="bookmarks-trigger"
        className={TRIGGER_CLASS}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={open ? 'Close bookmarks' : 'Bookmarks'}
        title="Bookmarks"
        onClick={() => {
          const next = !open
          if (next) refreshList()
          else resetSearch()
          setOpen(next)
        }}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <div
              data-bookmarks-dropdown-backdrop="true"
              className="bookmarks-dropdown-backdrop fixed inset-0 z-55 print-hide cursor-pointer bg-slate-950/55 dark:bg-slate-950/70"
              aria-hidden
              onClick={() => closeDropdown()}
            />
            <div
              ref={panelRef}
              data-tour="bookmarks-panel"
              className="flex flex-col overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl min-h-0"
              style={panelStyle}
              role="dialog"
              aria-label="Bookmarks"
            >
              <div className="border-b border-slate-200 dark:border-slate-600 px-3 py-2 shrink-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Bookmarks
                </p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-2 space-y-2">
                <button
                  type="button"
                  data-tour="bookmarks-add"
                  onClick={handleAdd}
                  className="inline-flex w-full items-center justify-center gap-2 px-4 py-3 text-base font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 active:bg-slate-300 dark:active:bg-slate-500 border border-slate-300 dark:border-slate-600 rounded-lg transition-colors shadow-sm min-h-[48px] cursor-pointer"
                >
                  <span className="text-lg leading-none" aria-hidden>
                    +
                  </span>
                  Add bookmark
                </button>
                <div className="border-b border-slate-200 dark:border-slate-600 -mx-2 px-2 pb-2 shrink-0">
                  <label htmlFor="bookmarks-panel-search" className="sr-only">
                    Search bookmarks
                  </label>
                  <input
                    id="bookmarks-panel-search"
                    type="search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search…"
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                    aria-controls="bookmarks-panel-filtered-rows"
                  />
                </div>
                {addHint && (
                  <p className="text-xs text-amber-700 dark:text-amber-300 px-1">
                    {addHint}
                  </p>
                )}
                <div id="bookmarks-panel-filtered-rows" aria-live="polite">
                  {bookmarks.length > 0 && filteredBookmarks.length === 0 && (
                    <p className="px-1 py-2 text-sm text-slate-600 dark:text-slate-300">
                      No bookmarks match your search.
                    </p>
                  )}
                  {filteredBookmarks.length > 0 && (
                    <div className="mt-1 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
                      <div role="list">
                        {filteredBookmarks.map((b) => (
                          <div
                            key={b.id}
                            role="listitem"
                            data-tour="bookmarks-row"
                            data-bookmark-id={b.id}
                            className="flex border-b border-slate-100 dark:border-slate-600 last:border-b-0"
                          >
                            <button
                              type="button"
                              onClick={() => handleOpenBookmark(b)}
                              className="min-w-0 flex-1 cursor-pointer text-left px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors"
                            >
                              <span className="font-medium line-clamp-2 block">
                                {b.resourceTitle}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 block">
                                {b.locationLabel}
                              </span>
                            </button>
                            <button
                              type="button"
                              data-tour="bookmarks-remove"
                              data-bookmark-id={b.id}
                              onClick={(e) => handleRemove(e, b.id)}
                              className="shrink-0 flex cursor-pointer items-center justify-center px-3 min-h-[48px] text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-slate-50 dark:hover:bg-slate-700/80"
                              aria-label="Remove bookmark"
                              title="Remove"
                            >
                              <svg
                                className="w-5 h-5"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                aria-hidden
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                                />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  )
}
