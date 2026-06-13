/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'

const attemptCapacitorRecoveryReloadMock = jest.fn(() => false)
const isCapacitorNativeAppMock = jest.fn(() => false)

jest.mock('@/lib/capacitorAppRecovery', () => ({
  isCapacitorNativeApp: () => isCapacitorNativeAppMock(),
  attemptCapacitorRecoveryReload: (...args: unknown[]) =>
    attemptCapacitorRecoveryReloadMock(...args),
}))

import RouteError from '../error'

describe('app/error', () => {
  beforeEach(() => {
    attemptCapacitorRecoveryReloadMock.mockClear()
    attemptCapacitorRecoveryReloadMock.mockReturnValue(false)
    isCapacitorNativeAppMock.mockReturnValue(false)
  })

  it('renders recovery actions for route errors on web', async () => {
    const reset = jest.fn()
    render(<RouteError error={new Error('Test failure')} reset={reset} />)

    expect(screen.getByRole('heading', { name: /Something went wrong/i })).toBeInTheDocument()
    expect(screen.getByText(/Test failure/i)).toBeInTheDocument()
    await waitFor(() => expect(reset).toHaveBeenCalled())
    expect(attemptCapacitorRecoveryReloadMock).not.toHaveBeenCalled()
  })

  it('renders reconnecting UI on native instead of the web error card', () => {
    isCapacitorNativeAppMock.mockReturnValue(true)

    const reset = jest.fn()
    render(<RouteError error={new Error('Test failure')} reset={reset} />)

    expect(screen.getByText(/Reconnecting\.\.\./i)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Something went wrong/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/Test failure/i)).not.toBeInTheDocument()
    expect(document.querySelector('[data-gospel-surface]')).toBeInTheDocument()
  })

  it('calls reset on native when recovery reload is not attempted', async () => {
    isCapacitorNativeAppMock.mockReturnValue(true)
    attemptCapacitorRecoveryReloadMock.mockReturnValue(false)

    const reset = jest.fn()
    render(<RouteError error={new Error('Test failure')} reset={reset} />)

    await waitFor(() => expect(reset).toHaveBeenCalled())
    expect(attemptCapacitorRecoveryReloadMock).toHaveBeenCalledWith('route-error')
  })

  it('does not call reset on native when recovery reload succeeds', async () => {
    isCapacitorNativeAppMock.mockReturnValue(true)
    attemptCapacitorRecoveryReloadMock.mockReturnValue(true)

    const reset = jest.fn()
    render(<RouteError error={new Error('Test failure')} reset={reset} />)

    await waitFor(() =>
      expect(attemptCapacitorRecoveryReloadMock).toHaveBeenCalledWith('route-error')
    )
    expect(reset).not.toHaveBeenCalled()
  })
})
