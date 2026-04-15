/**
 * @jest-environment jsdom
 */

import { isMemorizeAndroidWebHost } from '@/lib/memorizationViewportPlatform'

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
