/**
 * @jest-environment jsdom
 */
import {
  applyThemePersistenceSnapshot,
  readThemePersistenceSnapshot,
} from '@/contexts/ThemeContext'

describe('ThemeContext persistence snapshot', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('read returns explicit when a theme is stored', () => {
    localStorage.setItem('gospel-profile-theme', 'dark')
    expect(readThemePersistenceSnapshot()).toEqual({ kind: 'explicit', theme: 'dark' })
  })

  it('read returns system when storage key is absent', () => {
    expect(readThemePersistenceSnapshot()).toEqual({ kind: 'system' })
  })

  it('apply explicit restores the stored value', () => {
    localStorage.setItem('gospel-profile-theme', 'light')
    applyThemePersistenceSnapshot({ kind: 'explicit', theme: 'dark' })
    expect(localStorage.getItem('gospel-profile-theme')).toBe('dark')
  })

  it('apply system removes the storage key', () => {
    localStorage.setItem('gospel-profile-theme', 'light')
    applyThemePersistenceSnapshot({ kind: 'system' })
    expect(localStorage.getItem('gospel-profile-theme')).toBeNull()
  })
})
