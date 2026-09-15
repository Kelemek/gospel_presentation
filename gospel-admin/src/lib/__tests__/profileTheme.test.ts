/**
 * @jest-environment jsdom
 */
import {
  applyThemeToDocument,
  getSystemTheme,
  isAdminPathname,
  nextTheme,
  parseStoredTheme,
  resolveTheme,
  themeUsesDarkClass,
} from '../profileTheme'

describe('profileTheme', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark')
    document.body.classList.remove('dark')
    document.documentElement.removeAttribute('data-theme')
  })

  describe('parseStoredTheme', () => {
    it('accepts light, dark, and black', () => {
      expect(parseStoredTheme('light')).toBe('light')
      expect(parseStoredTheme('dark')).toBe('dark')
      expect(parseStoredTheme('black')).toBe('black')
    })

    it('rejects invalid values', () => {
      expect(parseStoredTheme(null)).toBeNull()
      expect(parseStoredTheme('')).toBeNull()
      expect(parseStoredTheme('system')).toBeNull()
    })
  })

  describe('nextTheme', () => {
    it('cycles light → dark → black → light', () => {
      expect(nextTheme('light')).toBe('dark')
      expect(nextTheme('dark')).toBe('black')
      expect(nextTheme('black')).toBe('light')
    })
  })

  describe('resolveTheme', () => {
    it('uses stored when present', () => {
      expect(resolveTheme('black', 'light')).toBe('black')
    })

    it('falls back to system when stored is null', () => {
      expect(resolveTheme(null, 'dark')).toBe('dark')
    })
  })

  describe('isAdminPathname', () => {
    it('matches /admin and children only', () => {
      expect(isAdminPathname('/admin')).toBe(true)
      expect(isAdminPathname('/admin/settings')).toBe(true)
      expect(isAdminPathname('/default')).toBe(false)
      expect(isAdminPathname('/login')).toBe(false)
      expect(isAdminPathname(null)).toBe(false)
    })
  })

  describe('themeUsesDarkClass', () => {
    it('is true for dark and black', () => {
      expect(themeUsesDarkClass('light')).toBe(false)
      expect(themeUsesDarkClass('dark')).toBe(true)
      expect(themeUsesDarkClass('black')).toBe(true)
    })
  })

  describe('applyThemeToDocument', () => {
    it('applies dark class for dark without data-theme', () => {
      applyThemeToDocument('dark', '/default')
      expect(document.documentElement.classList.contains('dark')).toBe(true)
      expect(document.documentElement.getAttribute('data-theme')).toBeNull()
    })

    it('applies dark class and data-theme=black for black', () => {
      applyThemeToDocument('black', '/default')
      expect(document.documentElement.classList.contains('dark')).toBe(true)
      expect(document.documentElement.getAttribute('data-theme')).toBe('black')
    })

    it('strips dark and data-theme on admin paths', () => {
      applyThemeToDocument('black', '/admin')
      expect(document.documentElement.classList.contains('dark')).toBe(false)
      expect(document.documentElement.getAttribute('data-theme')).toBeNull()
    })
  })

  describe('getSystemTheme', () => {
    it('returns light or dark from matchMedia', () => {
      const matchMediaMock = jest.fn().mockImplementation((query: string) => ({
        matches: query.includes('dark'),
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }))
      Object.defineProperty(window, 'matchMedia', { value: matchMediaMock, writable: true })
      expect(getSystemTheme()).toBe('dark')
    })
  })
})
