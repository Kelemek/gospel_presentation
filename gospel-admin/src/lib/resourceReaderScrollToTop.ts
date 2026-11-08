import { isKindleBrowser } from '@/lib/kindleUserAgent'

/** Downward scroll, in viewports, before the back-to-top control appears. */
export const RESOURCE_READER_SCROLL_TOP_VIEWPORTS = 1

export function resourceReaderScrollOffset(): number {
  if (typeof window === 'undefined') return 0
  return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0
}

export function resourceReaderViewportHeight(): number {
  if (typeof window === 'undefined') return 0
  return window.innerHeight || document.documentElement.clientHeight || 0
}

/** True after about one viewport of downward scrolling. False near the top. */
export function isResourceReaderScrolledPastTopThreshold(
  scrollOffset: number,
  viewportHeight: number
): boolean {
  if (!Number.isFinite(viewportHeight) || viewportHeight <= 0) return false
  if (!Number.isFinite(scrollOffset) || scrollOffset < 0) return false
  return scrollOffset >= viewportHeight * RESOURCE_READER_SCROLL_TOP_VIEWPORTS
}

export function isResourceReaderModalOverlayOpen(): boolean {
  if (typeof document === 'undefined') return false
  return document.querySelector('[aria-modal="true"]') != null
}

/**
 * Smooth unless the reader asked for reduced motion.
 * `instant` stays immediate even if a later stylesheet sets `scroll-behavior: smooth`.
 */
export function resourceReaderScrollToTopBehavior(): ScrollBehavior {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'smooth'
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
}

/** Scroll the window to the true top of the page. The reader has no nested scroll container. */
export function scrollResourceReaderToPageTop(): void {
  if (typeof window === 'undefined') return
  window.scrollTo({
    top: 0,
    left: 0,
    behavior: resourceReaderScrollToTopBehavior(),
  })
}

export function shouldShowResourceReaderScrollToTop(
  scrollOffset: number,
  viewportHeight: number,
  modalOverlayOpen: boolean
): boolean {
  if (isKindleBrowser()) return false
  if (modalOverlayOpen) return false
  return isResourceReaderScrolledPastTopThreshold(scrollOffset, viewportHeight)
}
