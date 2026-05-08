/**
 * @jest-environment jsdom
 */

import {
  getReadAlongBoundaryUiLagMs,
  getReadAlongWordsTrail,
  READ_ALONG_BOUNDARY_UI_LAG_MS_DEFAULT,
  READ_ALONG_WORDS_TRAIL_DEFAULT,
} from '@/lib/readAlongBoundaryUiLag'

describe('readAlongBoundaryUiLag', () => {
  const origUA = navigator.userAgent

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      value: origUA,
      configurable: true,
    })
  })

  it('exports defaults in a sensible range', () => {
    expect(READ_ALONG_BOUNDARY_UI_LAG_MS_DEFAULT).toBeGreaterThan(0)
    expect(READ_ALONG_BOUNDARY_UI_LAG_MS_DEFAULT).toBeLessThanOrEqual(400)
    expect(READ_ALONG_WORDS_TRAIL_DEFAULT).toBeGreaterThanOrEqual(0)
    expect(READ_ALONG_WORDS_TRAIL_DEFAULT).toBeLessThanOrEqual(8)
  })

  it('getReadAlongBoundaryUiLagMs returns values in (0, 400]', () => {
    expect(getReadAlongBoundaryUiLagMs()).toBeGreaterThan(0)
    expect(getReadAlongBoundaryUiLagMs()).toBeLessThanOrEqual(400)
  })

  it('classifies Chromium and uses a longer word trail', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      configurable: true,
    })
    expect(getReadAlongBoundaryUiLagMs()).toBe(100)
    expect(getReadAlongWordsTrail()).toBe(4)
  })

  it('classifies desktop Safari (no Chrome token) with shorter trail and lag', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
      configurable: true,
    })
    expect(getReadAlongBoundaryUiLagMs()).toBe(90)
    expect(getReadAlongWordsTrail()).toBe(2)
  })

  it('classifies iPhone Safari as WebKit Safari', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      configurable: true,
    })
    expect(getReadAlongWordsTrail()).toBe(2)
    expect(getReadAlongBoundaryUiLagMs()).toBe(90)
  })

  it('classifies Chrome on iOS as Chromium', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1',
      configurable: true,
    })
    expect(getReadAlongWordsTrail()).toBe(4)
    expect(getReadAlongBoundaryUiLagMs()).toBe(100)
  })

  it('Firefox-like UA uses defaults', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; rv:121.0) Gecko/20100101 Firefox/121.0',
      configurable: true,
    })
    expect(getReadAlongBoundaryUiLagMs()).toBe(READ_ALONG_BOUNDARY_UI_LAG_MS_DEFAULT)
    expect(getReadAlongWordsTrail()).toBe(READ_ALONG_WORDS_TRAIL_DEFAULT)
  })
})
