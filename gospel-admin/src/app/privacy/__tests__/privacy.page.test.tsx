import React from 'react'
import { render, screen } from '@testing-library/react'

import PrivacyPage from '../page'

describe('Privacy page', () => {
  it('renders and contains Privacy heading and key sections', () => {
    render(<PrivacyPage />)

    const heading = screen.getByRole('heading', { name: /Privacy Policy/i })
    expect(heading).toBeInTheDocument()

    const introHeading = screen.getByRole('heading', { name: /Introduction/i })
    expect(introHeading).toBeInTheDocument()

    const dataHeading = screen.getByRole('heading', { name: /Data We Collect/i })
    expect(dataHeading).toBeInTheDocument()
  })
})
