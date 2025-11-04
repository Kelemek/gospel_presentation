import React from 'react'
import { render, screen } from '@testing-library/react'

import CopyrightPage from '../page'

describe('Copyright page', () => {
  it('renders attribution sections and current year', () => {
    render(<CopyrightPage />)

    // Check for known headings (use getAllByText because the phrase may appear in multiple elements)
    const contentMatches = screen.getAllByText(/Content Attribution/i)
    expect(contentMatches.length).toBeGreaterThan(0)

    const scriptureHeading = screen.getByRole('heading', { name: /Scripture Attribution/i })
    expect(scriptureHeading).toBeInTheDocument()

    const techHeading = screen.getByRole('heading', { name: /Technical Implementation/i })
    expect(techHeading).toBeInTheDocument()

    // Current year appears in the footer string
    const year = new Date().getFullYear().toString()
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument()
  })
})
