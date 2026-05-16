/**
 * @jest-environment jsdom
 */

import {
  isMemorizeAndroidWebHost,
  isMemorizeIosWebHost,
  isProfileResourceListenControlAvailable,
} from '@/lib/memorizationViewportPlatform'

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

describe('isProfileResourceListenControlAvailable', () => {
  const defineUA = (ua: string) => {
    Object.defineProperty(navigator, 'userAgent', {
      value: ua,
      configurable: true,
    })
  }

  it('is false on Android Web hosts (Listen control hidden)', () => {
    defineUA('Mozilla/5.0 (Linux; Android 14; Pixel) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36')
    expect(isProfileResourceListenControlAvailable()).toBe(false)
  })

  it('is true on non-Android user agents', () => {
    defineUA(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    )
    expect(isProfileResourceListenControlAvailable()).toBe(true)
    defineUA('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36')
    expect(isProfileResourceListenControlAvailable()).toBe(true)
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
