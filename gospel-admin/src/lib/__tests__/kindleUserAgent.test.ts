import { isKindleBrowser, isKindleUserAgent } from '@/lib/kindleUserAgent'

describe('isKindleUserAgent', () => {
  it('detects Kindle user agents', () => {
    expect(isKindleUserAgent('Mozilla/5.0 (Linux; U; en-US) AppleWebKit/535.19 (KHTML, like Gecko) Silk/3.13 Safari/535.19 Silk-Accelerated=true')).toBe(true)
    expect(isKindleUserAgent('Mozilla/5.0 (X11; U; Linux armv7l like Android; en-us) AppleWebKit/531.2+ (KHTML, like Gecko) Version/5.0 Safari/533.2+ Kindle/3.0+')).toBe(true)
  })

  it('returns false for normal browsers', () => {
    expect(isKindleUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36')).toBe(false)
    expect(isKindleUserAgent('')).toBe(false)
  })
})

describe('isKindleBrowser', () => {
  const kindleUa =
    'Mozilla/5.0 (Linux; U; en-US) AppleWebKit/535.19 (KHTML, like Gecko) Silk/3.13 Safari/535.19 Silk-Accelerated=true'

  it('detects Kindle from navigator.userAgent', () => {
    const original = navigator.userAgent
    Object.defineProperty(navigator, 'userAgent', { value: kindleUa, configurable: true })
    try {
      expect(isKindleBrowser()).toBe(true)
    } finally {
      Object.defineProperty(navigator, 'userAgent', { value: original, configurable: true })
    }
  })
})
