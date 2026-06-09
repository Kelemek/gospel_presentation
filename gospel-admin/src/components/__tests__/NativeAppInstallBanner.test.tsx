import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Capacitor } from '@capacitor/core'
import { NativeAppInstallBanner } from '../NativeAppInstallBanner'
import {
  INFO_PAGE_APP_STORE_URL,
  INFO_PAGE_PLAY_STORE_URL,
} from '@/lib/info-page-links'
import { NATIVE_APP_INSTALL_BANNER_DISMISS_KEY } from '@/lib/nativeAppInstallBanner'

const mockPathname = jest.fn(() => '/default')

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}))

jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: jest.fn(() => false),
  },
}))

const mockedIsNative = Capacitor.isNativePlatform as jest.MockedFunction<
  typeof Capacitor.isNativePlatform
>

const IOS_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
const IPAD_DESKTOP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
const ANDROID_TABLET_UA =
  'Mozilla/5.0 (Linux; Android 14; SM-X900) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const DESKTOP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

describe('NativeAppInstallBanner', () => {
  const originalUA = navigator.userAgent
  const originalMaxTouchPoints = navigator.maxTouchPoints

  beforeEach(() => {
    jest.clearAllMocks()
    mockedIsNative.mockReturnValue(false)
    mockPathname.mockReturnValue('/default')
    window.localStorage.removeItem(NATIVE_APP_INSTALL_BANNER_DISMISS_KEY)
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: IOS_UA,
    })
    Object.defineProperty(window.navigator, 'maxTouchPoints', {
      configurable: true,
      value: 1,
    })
  })

  afterAll(() => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: originalUA,
    })
    Object.defineProperty(window.navigator, 'maxTouchPoints', {
      configurable: true,
      value: originalMaxTouchPoints,
    })
  })

  it('renders on mobile web with App Store link on iOS', async () => {
    render(<NativeAppInstallBanner />)

    const link = await screen.findByRole('link', { name: /get app/i })
    expect(link).toHaveAttribute('href', INFO_PAGE_APP_STORE_URL)
    expect(link).toHaveAttribute('target', '_blank')
    expect(screen.getByRole('region', { name: /get the mobile app/i })).toBeInTheDocument()
  })

  it('renders on iPad with desktop user agent when maxTouchPoints indicates tablet', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: IPAD_DESKTOP_UA,
    })
    Object.defineProperty(window.navigator, 'maxTouchPoints', {
      configurable: true,
      value: 5,
    })
    render(<NativeAppInstallBanner />)

    const link = await screen.findByRole('link', { name: /get app/i })
    expect(link).toHaveAttribute('href', INFO_PAGE_APP_STORE_URL)
  })

  it('uses Play Store link on Android tablet', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: ANDROID_TABLET_UA,
    })
    render(<NativeAppInstallBanner />)

    const link = await screen.findByRole('link', { name: /get app/i })
    expect(link).toHaveAttribute('href', INFO_PAGE_PLAY_STORE_URL)
  })

  it('uses Play Store link on Android', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: ANDROID_UA,
    })
    render(<NativeAppInstallBanner />)

    const link = await screen.findByRole('link', { name: /get app/i })
    expect(link).toHaveAttribute('href', INFO_PAGE_PLAY_STORE_URL)
  })

  it('does not render on desktop', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: DESKTOP_UA,
    })
    render(<NativeAppInstallBanner />)

    await waitFor(() => {
      expect(screen.queryByRole('region', { name: /get the mobile app/i })).not.toBeInTheDocument()
    })
  })

  it('does not render on Capacitor native', async () => {
    mockedIsNative.mockReturnValue(true)
    render(<NativeAppInstallBanner />)

    await waitFor(() => {
      expect(screen.queryByRole('region', { name: /get the mobile app/i })).not.toBeInTheDocument()
    })
  })

  it('does not render on /info', async () => {
    mockPathname.mockReturnValue('/info')
    render(<NativeAppInstallBanner />)

    await waitFor(() => {
      expect(screen.queryByRole('region', { name: /get the mobile app/i })).not.toBeInTheDocument()
    })
  })

  it('dismiss hides banner and persists to localStorage', async () => {
    render(<NativeAppInstallBanner />)

    await screen.findByRole('region', { name: /get the mobile app/i })
    fireEvent.click(screen.getByRole('button', { name: /dismiss app install banner/i }))

    expect(screen.queryByRole('region', { name: /get the mobile app/i })).not.toBeInTheDocument()
    expect(window.localStorage.getItem(NATIVE_APP_INSTALL_BANNER_DISMISS_KEY)).toBe('1')
  })

  it('stays hidden when dismiss flag is set', async () => {
    window.localStorage.setItem(NATIVE_APP_INSTALL_BANNER_DISMISS_KEY, '1')
    render(<NativeAppInstallBanner />)

    await waitFor(() => {
      expect(screen.queryByRole('region', { name: /get the mobile app/i })).not.toBeInTheDocument()
    })
  })

  it('hides when dismiss flag is set in another tab', async () => {
    render(<NativeAppInstallBanner />)

    await screen.findByRole('region', { name: /get the mobile app/i })

    window.localStorage.setItem(NATIVE_APP_INSTALL_BANNER_DISMISS_KEY, '1')
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: NATIVE_APP_INSTALL_BANNER_DISMISS_KEY,
        newValue: '1',
        storageArea: window.localStorage,
      })
    )

    await waitFor(() => {
      expect(screen.queryByRole('region', { name: /get the mobile app/i })).not.toBeInTheDocument()
    })
  })
})
