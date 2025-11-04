import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import ErrorBoundary from '@/components/ErrorBoundary'

describe('ErrorBoundary', () => {
  test('renders custom fallback when provided', () => {
    const Bomb = () => {
      throw new Error('boom')
    }

    render(
      <ErrorBoundary fallback={<div data-testid="fallback">custom</div>}>
        <Bomb />
      </ErrorBoundary>
    )

    expect(screen.getByTestId('fallback')).toBeInTheDocument()
    expect(screen.getByText('custom')).toBeInTheDocument()
  })

  test('shows default fallback, displays error message and resets on Try Again', async () => {
    // Use a mutable flag so we can simulate an error that is fixed after reset
    let shouldThrow = true
    const Flaky = () => {
      if (shouldThrow) throw new Error('flaky boom')
      return <div>Recovered</div>
    }

    render(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>
    )

    // Default fallback title
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
    // Error message shown
    expect(screen.getByText('flaky boom')).toBeInTheDocument()

    // Now fix the underlying component and click Try Again
    shouldThrow = false
    const tryAgain = screen.getByRole('button', { name: /Try Again/i })
    fireEvent.click(tryAgain)

    // After reset, the child should render normally
    expect(await screen.findByText('Recovered')).toBeInTheDocument()
  })
})
