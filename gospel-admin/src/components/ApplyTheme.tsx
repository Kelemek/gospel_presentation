'use client'

import { useLayoutEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'

const STORAGE_KEY = 'gospel-profile-theme'

function getStoredTheme(): 'light' | 'dark' | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return null
}

function applyThemeToDocument(theme: 'light' | 'dark') {
  const isDark = theme === 'dark'
  document.documentElement.classList.toggle('dark', isDark)
  document.body.classList.toggle('dark', isDark)
}

/**
 * Applies the theme from ThemeContext (localStorage or system) to the document
 * so all routes get consistent dark/light mode without needing their own ThemeProvider.
 * Uses localStorage directly when applying the class so the correct theme is shown on every
 * route (e.g. /copyright) even if context lags or resets on navigation.
 * Applies to both html and body so dark mode works even if one element is reset during hydration.
 */
export function ApplyTheme() {
  const { theme } = useTheme()
  const pathname = usePathname()

  useLayoutEffect(() => {
    const stored = getStoredTheme()
    const effectiveTheme = stored ?? theme
    applyThemeToDocument(effectiveTheme)
  }, [theme, pathname])

  return null
}
