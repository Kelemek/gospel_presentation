'use client'

import type { CSSProperties } from 'react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { scrollToTocAnchor } from '@/lib/scrollToTocAnchor'
import { plainTextForProfileHighlightUi } from '@/lib/profileHighlightVisibleText'
import type { ProfileHighlight } from '@/lib/profileHighlightsStorage'
import {
  loadHighlights,
  removeHighlight,
} from '@/lib/profileHighlightsStorage'
import { GOSPEL_CLOSE_BOOKMARKS_PANEL_EVENT } from '@/lib/bookmarksPanelCloseEvent'
import { useAlertModal } from '@/contexts/AlertModalContext'

const TRIGGER_CLASS =
  'p-2 rounded-md flex items-center justify-center min-h-[36px] min-w-[36px] bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-700 dark:active:bg-slate-800 dark:text-white transition-colors cursor-pointer'

const PANEL_MARGIN = 8
const HIGHLIGHTS_PANEL_CENTER_BELOW_PX = 768
const HIGHLIGHT_SEARCH_DEBOUNCE_MS = 250

function highlightMatchesSearch(h: ProfileHighlight, trimmedLowerNeedle: string): boolean {
  if (!trimmedLowerNeedle) return true
  const parts = [
    plainTextForProfileHighlightUi(h.quote),
    plainTextForProfileHighlightUi(h.locationLabel),
    h.resourceTitle,
    h.slug,
    h.anchorId,
    h.scopeId,
  ]
  return parts.some((t) => t.toLowerCase().includes(trimmedLowerNeedle))
}

function highlightsPanelStyleFromTrigger(rect: DOMRectReadOnly): CSSProperties {
  const vw = window.innerWidth
  const maxPreferred = Math.min(340, vw - 2 * PANEL_MARGIN)
  const top = rect.bottom + PANEL_MARGIN
  const maxHeight = 'min(75vh, 520px)'

  if (vw < HIGHLIGHTS_PANEL_CENTER_BELOW_PX) {
    const width = maxPreferred
    const left = Math.max(PANEL_MARGIN, (vw - width) / 2)
    return { position: 'fixed', zIndex: 60, top, left, width, maxHeight, right: 'auto' }
  }

  let width = maxPreferred
  let left = rect.right - width
  if (left < PANEL_MARGIN) {
    width = Math.min(maxPreferred, Math.max(0, rect.right - PANEL_MARGIN))
    left = PANEL_MARGIN
  }
  return { position: 'fixed', zIndex: 60, top, left, width, maxHeight, right: 'auto' }
}

interface HighlightsDropdownProps {
  profileSlug: string
  onOpenHighlight: (h: ProfileHighlight) => void
  onHighlightsChanged?: () => void
}

export default function HighlightsDropdown({
  profileSlug,
  onOpenHighlight,
  onHighlightsChanged,
}: HighlightsDropdownProps) {
  const router = useRouter()
  const { showConfirm } = useAlertModal()
  const [open, setOpen] = useState(false)
  const [highlights, setHighlights] = useState<ProfileHighlight[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({})

  const refreshList = useCallback(() => {
    const list = loadHighlights().sort((a, b) => b.createdAt - a.createdAt)
    setHighlights(list)
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
    setPanelStyle(highlightsPanelStyleFromTrigger(triggerRef.current.getBoundingClientRect()))
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
    const onTourClose = (): void => closeDropdown()
    window.addEventListener(GOSPEL_CLOSE_BOOKMARKS_PANEL_EVENT, onTourClose)
    return () => window.removeEventListener(GOSPEL_CLOSE_BOOKMARKS_PANEL_EVENT, onTourClose)
  }, [closeDropdown])

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim().toLowerCase())
    }, HIGHLIGHT_SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [searchInput])

  const filteredHighlights = debouncedSearch
    ? highlights.filter((h) => highlightMatchesSearch(h, debouncedSearch))
    : highlights

  const grouped = filteredHighlights.reduce<Record<string, ProfileHighlight[]>>((acc, h) => {
    const k = h.resourceTitle || h.slug
    if (!acc[k]) acc[k] = []
    acc[k]!.push(h)
    return acc
  }, {})

  const openHighlight = (h: ProfileHighlight) => {
    closeDropdown()
    if (h.slug === profileSlug) {
      const ok = scrollToTocAnchor(h.anchorId)
      if (ok) onOpenHighlight(h)
      return
    }
    router.push(`/${h.slug}#${encodeURIComponent(h.anchorId)}`)
  }

  const handleRemove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const confirmed = await showConfirm('Remove this highlight?')
    if (!confirmed) return
    removeHighlight(id)
    refreshList()
    onHighlightsChanged?.()
  }

  return (
    <div className="relative print-hide">
      <button
        ref={triggerRef}
        type="button"
        data-tour="highlights-trigger"
        className={TRIGGER_CLASS}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={open ? 'Close highlights' : 'Highlights'}
        title="Highlights"
        onClick={() => {
          const next = !open
          if (next) refreshList()
          else resetSearch()
          setOpen(next)
        }}
      >
        <svg
          className="w-5 h-5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m9 11-6 6v3h9l3-3" />
          <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
        </svg>
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-55 print-hide cursor-pointer bg-slate-950/55 dark:bg-slate-950/70"
              aria-hidden
              onClick={() => closeDropdown()}
            />
            <div
              ref={panelRef}
              data-tour="highlights-panel"
              className="flex flex-col overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl"
              style={panelStyle}
              role="dialog"
              aria-label="Highlights"
            >
              <div className="border-b border-slate-200 dark:border-slate-600 px-3 py-2 shrink-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Highlights</p>
              </div>
              <div className="border-b border-slate-200 dark:border-slate-600 px-3 py-2 shrink-0">
                <label htmlFor="highlights-panel-search" className="sr-only">
                  Search highlights
                </label>
                <input
                  id="highlights-panel-search"
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search…"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                  aria-controls="highlights-panel-list"
                />
              </div>
              <div id="highlights-panel-list" className="overflow-y-auto p-2 space-y-2 min-h-0 flex-1">
                {highlights.length === 0 ? (
                  <p className="px-1 py-3 text-sm text-slate-600 dark:text-slate-300">
                    No highlights yet. Select text in section content to add one.
                  </p>
                ) : Object.keys(grouped).length === 0 ? (
                  <p className="px-1 py-3 text-sm text-slate-600 dark:text-slate-300">
                    No highlights match your search.
                  </p>
                ) : null}
                {Object.entries(grouped).map(([resourceTitle, items]) => (
                  <details
                    key={resourceTitle}
                    className="border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 overflow-hidden"
                    open
                  >
                    <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-700">
                      {resourceTitle} ({items.length})
                    </summary>
                    <div role="list">
                      {items.map((h) => (
                        <div
                          key={h.id}
                          role="listitem"
                          className="flex border-t border-slate-100 dark:border-slate-600"
                        >
                          <button
                            type="button"
                            className="min-w-0 flex-1 cursor-pointer text-left px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80"
                            onClick={() => openHighlight(h)}
                          >
                            <span className="font-medium line-clamp-2 block">
                              “{plainTextForProfileHighlightUi(h.quote)}”
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 block">
                              {plainTextForProfileHighlightUi(h.locationLabel)}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleRemove(e, h.id)}
                            className="shrink-0 flex cursor-pointer items-center justify-center px-3 min-h-[48px] text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-slate-50 dark:hover:bg-slate-700/80"
                            aria-label="Remove highlight"
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
                  </details>
                ))}
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  )
}

