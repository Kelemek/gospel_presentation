'use client'

import { useLayoutEffect, useSyncExternalStore } from 'react'

const THEME_KEY = 'gospel-profile-theme'

function getStored(): 'light' | 'dark' | null {
  if (typeof window === 'undefined') return null
  const s = localStorage.getItem(THEME_KEY)
  return s === 'light' || s === 'dark' ? s : null
}

function getSystem(): 'light' | 'dark' {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getSnapshot(): 'light' | 'dark' {
  return getStored() ?? getSystem()
}

function getServerSnapshot(): 'light' | 'dark' {
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
 * Use on standalone pages (e.g. /copyright, /privacy) so they show the same dark/light mode as the rest of the app.
 */
export function usePageTheme(): 'light' | 'dark' {
  return useSyncExternalStore(subscribeTheme, getSnapshot, getServerSnapshot)
}

/**
 * Applies the current page theme to the document (html and body).
 * Call in useLayoutEffect when theme changes so the rest of the app stays in sync.
 */
export function useApplyPageThemeToDocument(theme: 'light' | 'dark') {
  useLayoutEffect(() => {
    const isDark = theme === 'dark'
    document.documentElement.classList.toggle('dark', isDark)
    document.body.classList.toggle('dark', isDark)
  }, [theme])
}
