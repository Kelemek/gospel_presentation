/** Public profile/presentation appearance (not used on /admin document chrome). */
export type Theme = 'light' | 'blossom' | 'dark' | 'black'

export type SystemTheme = 'light' | 'dark'

export type ThemeDocumentDataTheme = 'black' | 'blossom'

const STORED_VALUES: readonly Theme[] = ['light', 'blossom', 'dark', 'black']

export const THEME_CHOICES: readonly { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'blossom', label: 'Blossom' },
  { value: 'dark', label: 'Dark' },
  { value: 'black', label: 'Black' },
]

export function themeChoiceLabel(theme: Theme): string {
  for (const choice of THEME_CHOICES) {
    if (choice.value === theme) return choice.label
  }
  const _exhaustive: never = theme
  return _exhaustive
}

/** Values stored on `html[data-theme]`; light/dark use class only. */
export function themeDocumentDataTheme(theme: Theme): ThemeDocumentDataTheme | null {
  switch (theme) {
    case 'black':
      return 'black'
    case 'blossom':
      return 'blossom'
    case 'light':
    case 'dark':
      return null
    default: {
      const _exhaustive: never = theme
      return _exhaustive
    }
  }
}

export function parseStoredTheme(raw: string | null): Theme | null {
  if (raw === 'light' || raw === 'blossom' || raw === 'dark' || raw === 'black') return raw
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
      return 'blossom'
    case 'blossom':
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

  const dataTheme = themeDocumentDataTheme(effective)
  if (dataTheme) {
    document.documentElement.setAttribute('data-theme', dataTheme)
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
}

export function isValidStoredThemeValue(value: string): boolean {
  return (STORED_VALUES as readonly string[]).includes(value)
}
