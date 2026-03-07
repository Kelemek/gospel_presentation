import React from 'react'
import { render, screen } from '@testing-library/react'

import CopyrightPage from '../page'

const THEME_KEY = 'gospel-profile-theme'

describe('Copyright page', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.clear()
    }
    const matchMediaMock = jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }))
    Object.defineProperty(window, 'matchMedia', { value: matchMediaMock, writable: true })
  })

  it('renders attribution sections and current year', () => {
    render(<CopyrightPage />)

    const contentMatches = screen.getAllByText(/Content Attribution/i)
    expect(contentMatches.length).toBeGreaterThan(0)

    const scriptureHeading = screen.getByRole('heading', { name: /Scripture Attribution/i })
    expect(scriptureHeading).toBeInTheDocument()

    const techHeading = screen.getByRole('heading', { name: /Technical Implementation/i })
    expect(techHeading).toBeInTheDocument()

    const year = new Date().getFullYear().toString()
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument()
  })

  it('applies dark class to document when theme is dark from localStorage', () => {
    window.localStorage.setItem(THEME_KEY, 'dark')
    render(<CopyrightPage />)

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.body.classList.contains('dark')).toBe(true)
  })
})
