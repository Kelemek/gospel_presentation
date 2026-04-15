import React from 'react'
import { render, screen } from '@testing-library/react'

import InfoPage from '../page'
import {
  INFO_PAGE_APP_STORE_URL,
  INFO_PAGE_PLAY_STORE_URL,
  INFO_PAGE_WEB_URL,
} from '@/lib/info-page-links'

describe('Info page', () => {
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

  it('renders title, feature highlights, and QR links', () => {
    const { container } = render(<InfoPage />)

    expect(screen.getByRole('heading', { name: /^The Gospel Presentation$/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /App Features/i })).toBeInTheDocument()
    expect(
      screen.getByText(/Read scriptures in their full biblical context/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Guided verse memorization with practice rounds/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Marriage seminar content by Dr\. Randy Westerberg/i)
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Marriage/i })).toBeInTheDocument()
    expect(screen.getByText(/Reverence - A Study for Christian Wives/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Biblical Counseling/i })).toBeInTheDocument()
    expect(screen.getByText(/The Nature Of True Repentance/i)).toBeInTheDocument()

    const expectAllLinksHref = (name: RegExp, href: string) => {
      const links = screen.getAllByRole('link', { name })
      expect(links.length).toBeGreaterThanOrEqual(1)
      for (const link of links) {
        expect(link).toHaveAttribute('href', href)
      }
    }
    expectAllLinksHref(/Website: open link/i, INFO_PAGE_WEB_URL)
    expectAllLinksHref(/App Store: open link/i, INFO_PAGE_APP_STORE_URL)
    expectAllLinksHref(/Google Play: open link/i, INFO_PAGE_PLAY_STORE_URL)

    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThanOrEqual(3)
  })
})
