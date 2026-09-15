'use client'

import { useLayoutEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'
import { THEME_STORAGE_KEY } from '@/lib/theme-init-script'
import { applyThemeToDocument, parseStoredTheme } from '@/lib/profileTheme'

const STORAGE_KEY = THEME_STORAGE_KEY

/**
 * Applies the theme from ThemeContext (localStorage or system) to the document
 * so all routes get consistent dark/light/black mode without needing their own ThemeProvider.
 * Uses localStorage directly when applying the class so the correct theme is shown on every
 * route (e.g. /copyright) even if context lags or resets on navigation.
 * On /admin routes, document theme is forced light (admin UI stays light-only).
 */
export function ApplyTheme() {
  const { theme } = useTheme()
  const pathname = usePathname()

  useLayoutEffect(() => {
    const stored =
      typeof window !== 'undefined'
        ? parseStoredTheme(localStorage.getItem(STORAGE_KEY))
        : null
    const effective = stored ?? theme
    applyThemeToDocument(effective, pathname)
  }, [theme, pathname])

  return null
}
