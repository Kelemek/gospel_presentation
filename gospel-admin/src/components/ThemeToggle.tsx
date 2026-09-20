'use client'

import type { CSSProperties } from 'react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from '@/contexts/ThemeContext'
import { GOSPEL_CLOSE_BOOKMARKS_PANEL_EVENT } from '@/lib/bookmarksPanelCloseEvent'
import {
  THEME_CHOICES,
  themeChoiceLabel,
  type Theme,
} from '@/lib/profileTheme'

const TRIGGER_CLASS =
  'p-2 rounded-md flex items-center justify-center min-h-[36px] min-w-[36px] bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-700 dark:active:bg-slate-800 dark:text-white transition-colors cursor-pointer'

const PANEL_MARGIN = 8
const THEME_PANEL_PREFERRED_WIDTH = 200

/** Panel below trigger; right edge aligns with trigger (opens leftward) at all viewport widths. */
export function themePanelStyleFromTrigger(rect: DOMRectReadOnly): CSSProperties {
  const vw = window.innerWidth
  const maxPreferred = Math.min(THEME_PANEL_PREFERRED_WIDTH, vw - 2 * PANEL_MARGIN)
  const top = rect.bottom + PANEL_MARGIN
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
    right: 'auto',
  }
}

const THEME_OPTION_ICON_CLASS = 'w-5 h-5 shrink-0'

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  )
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
    </svg>
  )
}

function BlackModeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
    </svg>
  )
}

function BlossomIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="3.5 3.5 17 17"
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <circle cx="12" cy="7.1" r="2.65" />
      <circle cx="16.55" cy="10.45" r="2.65" />
      <circle cx="14.75" cy="15.45" r="2.65" />
      <circle cx="9.25" cy="15.45" r="2.65" />
      <circle cx="7.45" cy="10.45" r="2.65" />
    </svg>
  )
}

function ThemeOptionIcon({ theme, className }: { theme: Theme; className?: string }) {
  switch (theme) {
    case 'light':
      return <SunIcon className={className} />
    case 'blossom':
      return <BlossomIcon className={className} />
    case 'dark':
      return <MoonIcon className={className} />
    case 'black':
      return <BlackModeIcon className={className} />
    default: {
      const _exhaustive: never = theme
      return _exhaustive
    }
  }
}

function appearanceTriggerLabel(theme: Theme): string {
  return `Appearance: ${themeChoiceLabel(theme)}`
}

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({})

  const label = appearanceTriggerLabel(theme)

  const closeDropdown = useCallback(() => {
    setOpen(false)
  }, [])

  const positionPanel = useCallback(() => {
    if (!open || !triggerRef.current) return
    setPanelStyle(themePanelStyleFromTrigger(triggerRef.current.getBoundingClientRect()))
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
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDropdown()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, closeDropdown])

  useEffect(() => {
    const onTourClose = (): void => closeDropdown()
    window.addEventListener(GOSPEL_CLOSE_BOOKMARKS_PANEL_EVENT, onTourClose)
    return () => window.removeEventListener(GOSPEL_CLOSE_BOOKMARKS_PANEL_EVENT, onTourClose)
  }, [closeDropdown])

  const handlePick = (value: Theme) => {
    setTheme(value)
    closeDropdown()
  }

  return (
    <div className="relative print-hide shrink-0">
      <button
        ref={triggerRef}
        type="button"
        data-tour="theme-toggle"
        className={TRIGGER_CLASS}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={label}
        title={label}
        onClick={() => setOpen((prev) => !prev)}
      >
        <ThemeOptionIcon theme={theme} className={THEME_OPTION_ICON_CLASS} />
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
              data-tour="theme-panel"
              className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl"
              style={panelStyle}
              role="listbox"
              aria-label="Appearance"
            >
              {THEME_CHOICES.map(({ value, label: optionLabel }) => {
                const selected = theme === value
                return (
                  <button
                    key={value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    data-theme-option={value}
                    onClick={() => handlePick(value)}
                    className={`flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-sm text-left transition-colors border-b border-slate-100 dark:border-slate-600 last:border-b-0 ${
                      selected
                        ? 'bg-slate-100 dark:bg-slate-700 font-semibold text-slate-900 dark:text-slate-50'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {selected ? (
                      <svg
                        className="w-4 h-4 shrink-0 text-slate-600 dark:text-slate-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="w-4 shrink-0" aria-hidden />
                    )}
                    <ThemeOptionIcon theme={value} className={THEME_OPTION_ICON_CLASS} />
                    <span>{optionLabel}</span>
                  </button>
                )
              })}
            </div>
          </>,
          document.body
        )}
    </div>
  )
}
