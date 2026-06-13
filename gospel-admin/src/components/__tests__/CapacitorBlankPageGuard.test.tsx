/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, act } from '@testing-library/react'

const attemptCapacitorRecoveryReloadMock = jest.fn(() => true)
const hasGospelAppSurfaceMock = jest.fn(() => false)
const isCapacitorNativeAppMock = jest.fn(() => true)

jest.mock('next/navigation', () => ({
  usePathname: () => '/privacy',
}))

jest.mock('@/lib/capacitorAppRecovery', () => ({
  isCapacitorNativeApp: () => isCapacitorNativeAppMock(),
  hasGospelAppSurface: () => hasGospelAppSurfaceMock(),
  attemptCapacitorRecoveryReload: (...args: unknown[]) =>
    attemptCapacitorRecoveryReloadMock(...args),
}))

import { CapacitorBlankPageGuard } from '../CapacitorBlankPageGuard'

describe('CapacitorBlankPageGuard', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    attemptCapacitorRecoveryReloadMock.mockClear()
    hasGospelAppSurfaceMock.mockClear()
    isCapacitorNativeAppMock.mockReturnValue(true)
    hasGospelAppSurfaceMock.mockReturnValue(false)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('does not run on web', () => {
    isCapacitorNativeAppMock.mockReturnValue(false)
    render(<CapacitorBlankPageGuard />)

    act(() => {
      jest.advanceTimersByTime(8_000)
    })

    expect(attemptCapacitorRecoveryReloadMock).not.toHaveBeenCalled()
  })

  it('reloads when no painted surface after the watchdog delay', () => {
    render(<CapacitorBlankPageGuard />)

    act(() => {
      jest.advanceTimersByTime(8_000)
    })

    expect(attemptCapacitorRecoveryReloadMock).toHaveBeenCalledWith('blank-page-watchdog')
  })

  it('does not reload when static page content is detected', () => {
    hasGospelAppSurfaceMock.mockReturnValue(true)
    render(<CapacitorBlankPageGuard />)

    act(() => {
      jest.advanceTimersByTime(8_000)
    })

    expect(attemptCapacitorRecoveryReloadMock).not.toHaveBeenCalled()
  })
})
