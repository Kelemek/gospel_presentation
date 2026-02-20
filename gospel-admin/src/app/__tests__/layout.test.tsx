import React from 'react'
import { render, screen } from '@testing-library/react'
import RootLayout from '../layout'

jest.mock('next/font/google', () => ({
  Geist: () => ({ variable: '--font-geist-sans' }),
  Geist_Mono: () => ({ variable: '--font-geist-mono' }),
}))

describe('RootLayout', () => {
  it('renders children inside providers', () => {
    render(
      <RootLayout>
        <div data-testid="child">Page content</div>
      </RootLayout>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText('Page content')).toBeInTheDocument()
    expect(document.documentElement).toHaveAttribute('lang', 'en')
    expect(document.body).toHaveClass('antialiased')
  })
})
