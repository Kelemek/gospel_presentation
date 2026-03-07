import React from 'react'
import { render, screen } from '@testing-library/react'

import PrivacyPage from '../page'

const THEME_KEY = 'gospel-profile-theme'

describe('Privacy page', () => {
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

  it('renders and contains Privacy heading and key sections', () => {
    render(<PrivacyPage />)

    const heading = screen.getByRole('heading', { name: /Privacy Policy/i })
    expect(heading).toBeInTheDocument()

    const introHeading = screen.getByRole('heading', { name: /Introduction/i })
    expect(introHeading).toBeInTheDocument()

    const dataHeading = screen.getByRole('heading', { name: /Data We Collect/i })
    expect(dataHeading).toBeInTheDocument()
  })

  it('applies dark class to document when theme is dark from localStorage', () => {
    window.localStorage.setItem(THEME_KEY, 'dark')
    render(<PrivacyPage />)

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.body.classList.contains('dark')).toBe(true)
  })

  it('renders Back to Gospel Presentation link', () => {
    render(<PrivacyPage />)
    expect(screen.getByRole('link', { name: /Back to Gospel Presentation/i })).toBeInTheDocument()
  })
})
