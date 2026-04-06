'use client'

import React, { createContext, useContext, useSyncExternalStore, useCallback, useMemo } from 'react'

const STORAGE_KEY = 'gospel-profile-theme'

export type Theme = 'light' | 'dark'

function getSystemTheme(): Theme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return null
}

function getSnapshot(): Theme {
  const stored = getStoredTheme()
  return stored ?? getSystemTheme()
}

function getServerSnapshot(): Theme {
  return 'light'
}

const listeners = new Set<() => void>()
let storageListenerAdded = false

function notify() {
  listeners.forEach((l) => l())
}

/** Whether the user saved light/dark in localStorage or follows system preference (no key). */
export type ThemePersistenceSnapshot =
  | { kind: 'explicit'; theme: Theme }
  | { kind: 'system' }

/** Read current persistence state (for help tours that temporarily change theme). */
export function readThemePersistenceSnapshot(): ThemePersistenceSnapshot {
  if (typeof window === 'undefined') return { kind: 'system' }
  const stored = getStoredTheme()
  if (stored) return { kind: 'explicit', theme: stored }
  return { kind: 'system' }
}

/** Restore persistence after a tour; reuses the same key and notifies subscribers as `setTheme` would. */
export function applyThemePersistenceSnapshot(snapshot: ThemePersistenceSnapshot): void {
  if (typeof window === 'undefined') return
  if (snapshot.kind === 'explicit') {
    localStorage.setItem(STORAGE_KEY, snapshot.theme)
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
  notify()
}

function onStorage() {
  notify()
}

function addStorageListeners() {
  if (typeof window === 'undefined' || storageListenerAdded) return
  storageListenerAdded = true
  window.addEventListener('storage', onStorage)
  const media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null
  if (media) media.addEventListener('change', onStorage)
}

function removeStorageListeners() {
  if (typeof window === 'undefined' || !storageListenerAdded) return
  storageListenerAdded = false
  window.removeEventListener('storage', onStorage)
  const media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null
  if (media) media.removeEventListener('change', onStorage)
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  addStorageListeners()
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) removeStorageListeners()
  }
}

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setTheme = useCallback((next: Theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, next)
      notify()
    }
  }, [])

  const value = useMemo<ThemeContextType>(() => ({ theme, setTheme }), [theme, setTheme])
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
