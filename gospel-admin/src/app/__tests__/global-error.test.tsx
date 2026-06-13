/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, waitFor } from '@testing-library/react'

const attemptCapacitorRecoveryReloadMock = jest.fn(() => false)
const isCapacitorNativeAppMock = jest.fn(() => false)

jest.mock('@/lib/capacitorAppRecovery', () => ({
  isCapacitorNativeApp: () => isCapacitorNativeAppMock(),
  attemptCapacitorRecoveryReload: (...args: unknown[]) =>
    attemptCapacitorRecoveryReloadMock(...args),
}))

import GlobalError from '../global-error'

describe('app/global-error', () => {
  beforeEach(() => {
    attemptCapacitorRecoveryReloadMock.mockClear()
    attemptCapacitorRecoveryReloadMock.mockReturnValue(false)
    isCapacitorNativeAppMock.mockReturnValue(false)
  })

  it('calls reset on web', async () => {
    const reset = jest.fn()
    render(<GlobalError error={new Error('Root failure')} reset={reset} />)

    await waitFor(() => expect(reset).toHaveBeenCalled())
    expect(attemptCapacitorRecoveryReloadMock).not.toHaveBeenCalled()
  })

  it('calls reset on native when recovery reload is not attempted', async () => {
    isCapacitorNativeAppMock.mockReturnValue(true)
    attemptCapacitorRecoveryReloadMock.mockReturnValue(false)

    const reset = jest.fn()
    render(<GlobalError error={new Error('Root failure')} reset={reset} />)

    await waitFor(() => expect(reset).toHaveBeenCalled())
    expect(attemptCapacitorRecoveryReloadMock).toHaveBeenCalledWith('global-error')
  })

  it('does not call reset on native when recovery reload succeeds', async () => {
    isCapacitorNativeAppMock.mockReturnValue(true)
    attemptCapacitorRecoveryReloadMock.mockReturnValue(true)

    const reset = jest.fn()
    render(<GlobalError error={new Error('Root failure')} reset={reset} />)

    await waitFor(() =>
      expect(attemptCapacitorRecoveryReloadMock).toHaveBeenCalledWith('global-error')
    )
    expect(reset).not.toHaveBeenCalled()
  })
})
