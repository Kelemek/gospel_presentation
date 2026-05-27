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

    expect(screen.getByRole('heading', { name: /Usage Terms/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /API\.Bible terms and conditions/i })).toHaveAttribute(
      'href',
      'https://docs.api.bible/terms-and-conditions'
    )

    expect(screen.getByRole('heading', { name: /New International Version \(NIV\)/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /New Living Translation \(NLT\)/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Christian Standard Bible \(CSB\)/i })).toBeInTheDocument()

    const techHeading = screen.getByRole('heading', { name: /Technical Implementation/i })
    expect(techHeading).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: /Christian Classics Ethereal Library \(CCEL\)/i })).toBeInTheDocument()
    expect(screen.getByText(/Charles H\. Spurgeon sermons/i)).toBeInTheDocument()
    expect(screen.getByText(/Charles H\. Spurgeon, Morning and Evening/i)).toBeInTheDocument()
    expect(screen.getByText(/John Calvin, Commentaries/i)).toBeInTheDocument()
    expect(screen.getByText(/Jonathan Edwards, Select Sermons/i)).toBeInTheDocument()
    expect(screen.getByText(/Matthew Henry.*Commentary on the Whole Bible/i)).toBeInTheDocument()
    expect(screen.getByText(/Martin Luther, Commentary on Galatians/i)).toBeInTheDocument()
    expect(screen.getByText(/John Bunyan, The Pilgrim's Progress/i)).toBeInTheDocument()
    expect(screen.getByText(/Robert Murray M'Cheyne, Bible Reading Plan/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'mcheyne-api' })).toHaveAttribute(
      'href',
      'https://github.com/speric/mcheyne-api/blob/master/plan.json'
    )
    const ccelLinks = screen.getAllByRole('link', { name: /Christian Classics Ethereal Library \(CCEL\)/i })
    expect(ccelLinks.some((l) => l.getAttribute('href') === 'https://www.ccel.org/ccel/spurgeon/')).toBe(true)
    expect(ccelLinks.some((l) => l.getAttribute('href') === 'https://www.ccel.org/ccel/henry/mhc.html')).toBe(true)
    expect(ccelLinks.some((l) => l.getAttribute('href') === 'https://www.ccel.org/ccel/bunyan/pilgrim.html')).toBe(
      true
    )
    expect(ccelLinks.some((l) => l.getAttribute('href') === 'https://www.ccel.org/ccel/calvin/commentaries.html')).toBe(
      true
    )

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
