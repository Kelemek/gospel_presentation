/**
 * Scroll profile content to a TOC anchor (same offset logic as Table of Contents).
 */

export const FALLBACK_HEADER_OFFSET = 80

export function getSafeAreaInsetTop(): number {
  if (typeof window === 'undefined') return 0
  const div = document.createElement('div')
  div.style.paddingTop = 'env(safe-area-inset-top)'
  div.style.position = 'fixed'
  div.style.visibility = 'hidden'
  document.body.appendChild(div)
  const computed = window.getComputedStyle(div)
  const inset = parseInt(computed.paddingTop, 10) || 0
  document.body.removeChild(div)
  return inset
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
