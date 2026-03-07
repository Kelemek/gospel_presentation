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

  it('applies dark class to document when theme is dark', () => {
    window.localStorage.setItem(THEME_KEY, 'dark')
    render(<TestConsumer />)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.body.classList.contains('dark')).toBe(true)
  })

  it('does not apply dark class to document when theme is light', () => {
    window.localStorage.clear()
    render(<TestConsumer />)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.body.classList.contains('dark')).toBe(false)
  })
})
