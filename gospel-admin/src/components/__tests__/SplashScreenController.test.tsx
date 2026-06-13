import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { SplashScreenController } from '../SplashScreenController'

const mockHide = jest.fn().mockResolvedValue(undefined)

jest.mock('@capacitor/splash-screen', () => ({
  SplashScreen: { hide: () => mockHide() },
}))

describe('SplashScreenController', () => {
  beforeEach(() => {
    mockHide.mockClear()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders nothing (null)', () => {
    const { container } = render(<SplashScreenController />)
    expect(container.firstChild).toBeNull()
  })

  it('calls SplashScreen.hide after delay', async () => {
    Object.defineProperty(document, 'readyState', {
      value: 'loading',
      writable: true,
    })
    render(<SplashScreenController />)
    expect(mockHide).not.toHaveBeenCalled()
    jest.advanceTimersByTime(400)
    await waitFor(() => expect(mockHide).toHaveBeenCalled())
    Object.defineProperty(document, 'readyState', {
      value: 'complete',
      writable: true,
    })
  })

  it('calls SplashScreen.hide on window load if before delay', async () => {
    Object.defineProperty(document, 'readyState', {
      value: 'loading',
      writable: true,
    })
    render(<SplashScreenController />)
    jest.advanceTimersByTime(100)
    window.dispatchEvent(new Event('load'))
    await waitFor(() => expect(mockHide).toHaveBeenCalled())
    Object.defineProperty(document, 'readyState', {
      value: 'complete',
      writable: true,
    })
  })

  it('clears web splash timers with window.clearTimeout on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(window, 'clearTimeout')
    Object.defineProperty(document, 'readyState', {
      value: 'loading',
      writable: true,
    })

    const { unmount } = render(<SplashScreenController />)
    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalledTimes(2)
    clearTimeoutSpy.mockRestore()
    Object.defineProperty(document, 'readyState', {
      value: 'complete',
      writable: true,
    })
  })
})
