import React from 'react'
import { render, screen } from '@testing-library/react'
import { usePageTheme, useApplyPageThemeToDocument } from '../usePageTheme'

const THEME_KEY = 'gospel-profile-theme'

function TestConsumer() {
  const theme = usePageTheme()
  useApplyPageThemeToDocument(theme)
  return <span data-testid="theme-value">{theme}</span>
}

describe('usePageTheme', () => {
  let matchMediaMock: jest.Mock

  beforeEach(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.clear()
      document.documentElement.classList.remove('dark')
      document.body.classList.remove('dark')
      document.documentElement.removeAttribute('data-theme')
    }
    matchMediaMock = jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }))
    Object.defineProperty(window, 'matchMedia', { value: matchMediaMock, writable: true })
  })

  it('returns light when localStorage has no theme and system prefers light', () => {
    render(<TestConsumer />)
    expect(screen.getByTestId('theme-value')).toHaveTextContent('light')
  })

  it('returns dark when localStorage has gospel-profile-theme set to dark', () => {
    window.localStorage.setItem(THEME_KEY, 'dark')
    render(<TestConsumer />)
    expect(screen.getByTestId('theme-value')).toHaveTextContent('dark')
  })

  it('returns light when localStorage has gospel-profile-theme set to light', () => {
    window.localStorage.setItem(THEME_KEY, 'light')
    render(<TestConsumer />)
    expect(screen.getByTestId('theme-value')).toHaveTextContent('light')
  })

  it('returns black when localStorage has gospel-profile-theme set to black', () => {
    window.localStorage.setItem(THEME_KEY, 'black')
    render(<TestConsumer />)
    expect(screen.getByTestId('theme-value')).toHaveTextContent('black')
  })

  it('returns blossom when localStorage has gospel-profile-theme set to blossom', () => {
    window.localStorage.setItem(THEME_KEY, 'blossom')
    render(<TestConsumer />)
    expect(screen.getByTestId('theme-value')).toHaveTextContent('blossom')
  })

  it('applies data-theme=blossom without dark class when theme is blossom', () => {
    window.localStorage.setItem(THEME_KEY, 'blossom')
    render(<TestConsumer />)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.body.classList.contains('dark')).toBe(false)
    expect(document.documentElement.getAttribute('data-theme')).toBe('blossom')
  })

  it('applies dark class to document when theme is dark', () => {
    window.localStorage.setItem(THEME_KEY, 'dark')
    render(<TestConsumer />)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.body.classList.contains('dark')).toBe(true)
    expect(document.documentElement.getAttribute('data-theme')).toBeNull()
  })

  it('applies dark class and data-theme=black when theme is black', () => {
    window.localStorage.setItem(THEME_KEY, 'black')
    render(<TestConsumer />)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.body.classList.contains('dark')).toBe(true)
    expect(document.documentElement.getAttribute('data-theme')).toBe('black')
  })

  it('does not apply dark class to document when theme is light', () => {
    window.localStorage.clear()
    render(<TestConsumer />)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.body.classList.contains('dark')).toBe(false)
  })
})
