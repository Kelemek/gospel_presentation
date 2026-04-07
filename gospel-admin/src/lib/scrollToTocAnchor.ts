/**
 * Scroll profile content to a TOC anchor (same offset logic as Table of Contents).
 */

export const FALLBACK_HEADER_OFFSET = 80

/** Physical notch / home-indicator insets when `viewport-fit=cover` applies (often 0 in desktop devtools). */
export function getSafeAreaInsetsPx(): {
  top: number
  right: number
  bottom: number
  left: number
} {
  if (typeof window === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 }
  }
  const div = document.createElement('div')
  div.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    'width:0',
    'height:0',
    'visibility:hidden',
    'pointer-events:none',
    'padding-top:env(safe-area-inset-top,0px)',
    'padding-right:env(safe-area-inset-right,0px)',
    'padding-bottom:env(safe-area-inset-bottom,0px)',
    'padding-left:env(safe-area-inset-left,0px)',
  ].join(';')
  document.body.appendChild(div)
  const s = window.getComputedStyle(div)
  const p = (v: string) => parseFloat(v) || 0
  const top = p(s.paddingTop)
  const right = p(s.paddingRight)
  const bottom = p(s.paddingBottom)
  const left = p(s.paddingLeft)
  document.body.removeChild(div)
  return { top, right, bottom, left }
}

export function getSafeAreaInsetTop(): number {
  return getSafeAreaInsetsPx().top
}

/** Pixel offset from top of viewport for scroll targets (sticky header + safe area). */
export function getProfileHeaderScrollOffset(): number {
  if (typeof document === 'undefined') return FALLBACK_HEADER_OFFSET
  const header = document.querySelector('[data-profile-sticky-header]')
  let offset = FALLBACK_HEADER_OFFSET
  if (header instanceof HTMLElement) {
    const headerHeight = header.offsetHeight
    const safeAreaTop = getSafeAreaInsetTop()
    offset = headerHeight + safeAreaTop + (safeAreaTop > 0 ? 8 : 0)
  }
  return offset
}

/**
 * Scroll to element id. Returns true if the element was found and scrolled to.
 */
export function scrollToTocAnchor(
  anchorId: string,
  options?: { behavior?: ScrollBehavior; onDone?: () => void }
): boolean {
  if (typeof window === 'undefined') return false
  const el = document.getElementById(anchorId)
  if (!el) return false

  const offset = getProfileHeaderScrollOffset()
  const top = el.getBoundingClientRect().top + window.scrollY - offset
  window.scrollTo({ top, behavior: options?.behavior ?? 'smooth' })
  options?.onDone?.()
  return true
}
