/** Public profile/presentation appearance (not used on /admin document chrome). */
export type Theme = 'light' | 'dark' | 'black'

export type SystemTheme = 'light' | 'dark'

const STORED_VALUES: readonly Theme[] = ['light', 'dark', 'black']

export function parseStoredTheme(raw: string | null): Theme | null {
  if (raw === 'light' || raw === 'dark' || raw === 'black') return raw
  return null
}

export function getSystemTheme(): SystemTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function resolveTheme(stored: Theme | null, system: SystemTheme = getSystemTheme()): Theme {
  return stored ?? system
}

export function nextTheme(current: Theme): Theme {
  switch (current) {
    case 'light':
      return 'dark'
    case 'dark':
      return 'black'
    case 'black':
      return 'light'
    default: {
      const _exhaustive: never = current
      return _exhaustive
    }
  }
}

export function isAdminPathname(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  return pathname === '/admin' || pathname.startsWith('/admin/')
}

export function themeUsesDarkClass(theme: Theme): boolean {
  return theme === 'dark' || theme === 'black'
}

export function applyThemeToDocument(theme: Theme, pathname?: string | null): void {
  if (typeof document === 'undefined') return

  const effective: Theme = isAdminPathname(pathname) ? 'light' : theme
  const useDark = themeUsesDarkClass(effective)

  document.documentElement.classList.toggle('dark', useDark)
  document.body?.classList.toggle('dark', useDark)

  if (effective === 'black') {
    document.documentElement.setAttribute('data-theme', 'black')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
}

export function isValidStoredThemeValue(value: string): boolean {
  return (STORED_VALUES as readonly string[]).includes(value)
}
