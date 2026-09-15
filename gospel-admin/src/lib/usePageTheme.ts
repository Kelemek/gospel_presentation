'use client'

import { useLayoutEffect, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import {
  applyThemeToDocument,
  getSystemTheme,
  parseStoredTheme,
  resolveTheme,
  type Theme,
} from '@/lib/profileTheme'
import { THEME_STORAGE_KEY } from '@/lib/theme-init-script'

const THEME_KEY = THEME_STORAGE_KEY

function getStored(): Theme | null {
  if (typeof window === 'undefined') return null
  return parseStoredTheme(localStorage.getItem(THEME_KEY))
}

function getSnapshot(): Theme {
  return resolveTheme(getStored(), getSystemTheme())
}

function getServerSnapshot(): Theme {
  return 'light'
}

const listeners = new Set<() => void>()
function subscribeTheme(cb: () => void) {
  listeners.add(cb)
  if (listeners.size === 1 && typeof window !== 'undefined') {
    window.addEventListener('storage', notifyTheme)
    const m = window.matchMedia('(prefers-color-scheme: dark)')
    if (m?.addEventListener) m.addEventListener('change', notifyTheme)
  }
  return () => {
    listeners.delete(cb)
    if (listeners.size === 0 && typeof window !== 'undefined') {
      window.removeEventListener('storage', notifyTheme)
      const m = window.matchMedia('(prefers-color-scheme: dark)')
      if (m?.removeEventListener) m.removeEventListener('change', notifyTheme)
    }
  }
}
function notifyTheme() {
  listeners.forEach((c) => c())
}

/**
 * Reads theme from localStorage (gospel-profile-theme) with system fallback.
 * Use on standalone pages (e.g. /copyright, /privacy) so they show the same appearance as the rest of the app.
 */
export function usePageTheme(): Theme {
  return useSyncExternalStore(subscribeTheme, getSnapshot, getServerSnapshot)
}

/**
 * Applies the current page theme to the document (html and body).
 * Call in useLayoutEffect when theme changes so the rest of the app stays in sync.
 */
export function useApplyPageThemeToDocument(theme: Theme) {
  const pathname = usePathname()

  useLayoutEffect(() => {
    applyThemeToDocument(theme, pathname)
  }, [theme, pathname])
}
