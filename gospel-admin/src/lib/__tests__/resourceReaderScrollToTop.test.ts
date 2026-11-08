import {
  isResourceReaderScrolledPastTopThreshold,
  resourceReaderScrollToTopBehavior,
  scrollResourceReaderToPageTop,
  shouldShowResourceReaderScrollToTop,
} from '@/lib/resourceReaderScrollToTop'

describe('resource reader scroll-to-top', () => {
  const originalMatchMedia = window.matchMedia

  afterEach(() => {
    window.matchMedia = originalMatchMedia
    jest.restoreAllMocks()
  })

  it('treats one viewport of downward scroll as the visibility threshold', () => {
    expect(isResourceReaderScrolledPastTopThreshold(799, 800)).toBe(false)
    expect(isResourceReaderScrolledPastTopThreshold(800, 800)).toBe(true)
    expect(isResourceReaderScrolledPastTopThreshold(0, 800)).toBe(false)
    expect(isResourceReaderScrolledPastTopThreshold(100, 0)).toBe(false)
  })

  it('hides the control near the top, over a modal, and on Kindle', () => {
    expect(shouldShowResourceReaderScrollToTop(100, 800, false)).toBe(false)
    expect(shouldShowResourceReaderScrollToTop(800, 800, false)).toBe(true)
    expect(shouldShowResourceReaderScrollToTop(1200, 800, true)).toBe(false)

    const original = navigator.userAgent
    Object.defineProperty(navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (Linux; U; en-US) AppleWebKit/535.19 (KHTML, like Gecko) Silk/3.13 Safari/535.19 Silk-Accelerated=true',
      configurable: true,
    })
    try {
      expect(shouldShowResourceReaderScrollToTop(1200, 800, false)).toBe(false)
    } finally {
      Object.defineProperty(navigator, 'userAgent', { value: original, configurable: true })
    }
  })

  it('scrolls the window to the true top, immediately when reduced motion is requested', () => {
    const scrollTo = jest.fn()
    window.scrollTo = scrollTo

    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })) as unknown as typeof window.matchMedia

    scrollResourceReaderToPageTop()
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'smooth' })
    expect(resourceReaderScrollToTopBehavior()).toBe('smooth')

    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })) as unknown as typeof window.matchMedia

    scrollResourceReaderToPageTop()
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 0, left: 0, behavior: 'instant' })
    expect(resourceReaderScrollToTopBehavior()).toBe('instant')
  })
})
