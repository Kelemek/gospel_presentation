/**
 * @jest-environment jsdom
 */

import { Capacitor } from '@capacitor/core'
import {
  isMemorizeAndroidWebHost,
  isMemorizeIosWebHost,
  isProfileResourceSearchContentTouchBlurHost,
} from '@/lib/memorizationViewportPlatform'

jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: jest.fn(() => false),
    getPlatform: jest.fn(() => 'web'),
    isPluginAvailable: jest.fn(() => false),
  },
}))

describe('memorizationViewportPlatform', () => {
  const defineUA = (ua: string) => {
    Object.defineProperty(navigator, 'userAgent', {
      value: ua,
      configurable: true,
    })
  }

  it('returns true for Android user agents', () => {
    defineUA('Mozilla/5.0 (Linux; Android 14; Pixel) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36')
    expect(isMemorizeAndroidWebHost()).toBe(true)
  })

  it('returns false for iPhone user agents', () => {
    defineUA(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    )
    expect(isMemorizeAndroidWebHost()).toBe(false)
  })
})

describe('isMemorizeIosWebHost', () => {
  const defineUA = (ua: string) => {
    Object.defineProperty(navigator, 'userAgent', {
      value: ua,
      configurable: true,
    })
  }

  it('returns true for iPhone user agents', () => {
    defineUA(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    )
    expect(isMemorizeIosWebHost()).toBe(true)
  })

  it('returns false for Android user agents', () => {
    defineUA('Mozilla/5.0 (Linux; Android 14; Pixel) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36')
    expect(isMemorizeIosWebHost()).toBe(false)
  })
})

describe('isProfileResourceSearchContentTouchBlurHost', () => {
  const defineUA = (ua: string) => {
    Object.defineProperty(navigator, 'userAgent', {
      value: ua,
      configurable: true,
    })
  }

  it('returns true on iOS and Android', () => {
    defineUA(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    )
    expect(isProfileResourceSearchContentTouchBlurHost()).toBe(true)
    defineUA('Mozilla/5.0 (Linux; Android 14; Pixel) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36')
    expect(isProfileResourceSearchContentTouchBlurHost()).toBe(true)
  })

  it('returns false on desktop user agents', () => {
    defineUA('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36')
    expect(isProfileResourceSearchContentTouchBlurHost()).toBe(false)
  })
})
