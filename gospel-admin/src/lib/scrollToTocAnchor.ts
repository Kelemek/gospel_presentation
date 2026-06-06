/**
 * Scroll profile content to a TOC anchor (same offset logic as Table of Contents).
 */

export const FALLBACK_HEADER_OFFSET = 80

/** Extra space below the sticky header when aligning to a subsection title. */
export const SUBSECTION_TITLE_SCROLL_GAP_PX = 8

/** Direct child h4/h5 with `.print-subsection-title` (day/month headings). */
export function getSubsectionTitleElement(container: HTMLElement): HTMLElement | null {
  return container.querySelector<HTMLElement>(':scope > .print-subsection-title')
}

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

/** CSS custom property the sticky header's `top: calc(...)` adds on top of the safe-area inset. */
export const STICKY_HEADER_KEYBOARD_OFFSET_VAR = '--profile-sticky-kbd-offset'

/**
 * iOS-only sticky-header pin: `position: sticky` anchors to the *layout* viewport, which desyncs
 * from the *visual* viewport when the on-screen keyboard opens (the header slides above the visible
 * area). Write `visualViewport.offsetTop` into the header's keyboard-offset CSS variable so its
 * `top: calc(env(safe-area-inset-top) + var(...))` keeps it at the top of the visible area. Returns
 * the applied offset (px). Safe with a null/partial viewport.
 */
export function applyStickyHeaderVisualViewportTop(
  header: HTMLElement,
  viewport: { offsetTop: number } | null | undefined
): number {
  const offsetTop = Math.max(0, Math.round(viewport?.offsetTop ?? 0))
  header.style.setProperty(STICKY_HEADER_KEYBOARD_OFFSET_VAR, `${offsetTop}px`)
  return offsetTop
}

/** Pixel offset from top of viewport for scroll targets (sticky header + safe area). */
export function getProfileHeaderScrollOffset(): number {
  if (typeof document === 'undefined') return FALLBACK_HEADER_OFFSET
  const header = document.querySelector('[data-profile-sticky-header]')
  if (header instanceof HTMLElement) {
    const { bottom } = header.getBoundingClientRect()
    if (bottom > 0) {
      // Live layout (menu + tabs + open search, site header above when at page top).
      return Math.ceil(bottom)
    }
    const safeAreaTop = getSafeAreaInsetTop()
    return header.offsetHeight + safeAreaTop + (safeAreaTop > 0 ? 8 : 0)
  }
  return FALLBACK_HEADER_OFFSET
}

const SMOOTH_SCROLL_ON_DONE_FALLBACK_MS = 900

/** Run `onDone` after scroll settles (smooth scroll fires `onDone` too early if called synchronously). */
function scheduleScrollCompleteCallback(
  behavior: ScrollBehavior | undefined,
  onDone: (() => void) | undefined
): void {
  if (!onDone) return
  if (behavior !== 'smooth') {
    onDone()
    return
  }
  let called = false
  const run = () => {
    if (called) return
    called = true
    onDone()
  }
  if ('onscrollend' in window) {
    window.addEventListener('scrollend', run, { once: true })
  }
  window.setTimeout(run, SMOOTH_SCROLL_ON_DONE_FALLBACK_MS)
}

/**
 * Scroll to element id. Returns true if the element was found and scrolled to.
 */
export function scrollToTocAnchor(
  anchorId: string,
  options?: {
    behavior?: ScrollBehavior
    onDone?: () => void
    /** Scroll to the subsection heading (h4/h5) when present instead of the container top. */
    preferSubsectionTitle?: boolean
  }
): boolean {
  if (typeof window === 'undefined') return false
  const container = document.getElementById(anchorId)
  if (!container) return false

  const el = options?.preferSubsectionTitle
    ? getSubsectionTitleElement(container) ?? container
    : container

  const offset =
    getProfileHeaderScrollOffset() +
    (options?.preferSubsectionTitle ? SUBSECTION_TITLE_SCROLL_GAP_PX : 0)
  const behavior = options?.behavior ?? 'smooth'
  const top = el.getBoundingClientRect().top + window.scrollY - offset
  window.scrollTo({ top, behavior })
  scheduleScrollCompleteCallback(behavior, options?.onDone)
  return true
}

const DEFAULT_SCROLL_WHEN_READY_MAX_FRAMES = 90

/**
 * Retry {@link scrollToTocAnchor} until the anchor exists (large profiles paint many subsections
 * after hydration). Returns a cancel function for effect cleanup.
 */
export function scrollToTocAnchorWhenReady(
  anchorId: string,
  options?: {
    behavior?: ScrollBehavior
    maxFrames?: number
    onDone?: () => void
    onGiveUp?: () => void
    preferSubsectionTitle?: boolean
  }
): () => void {
  if (typeof window === 'undefined') return () => {}

  const maxFrames = options?.maxFrames ?? DEFAULT_SCROLL_WHEN_READY_MAX_FRAMES
  let frame = 0
  let rafId = 0

  const tick = () => {
    if (
      scrollToTocAnchor(anchorId, {
        behavior: options?.behavior ?? 'auto',
        onDone: options?.onDone,
        preferSubsectionTitle: options?.preferSubsectionTitle,
      })
    ) {
      return
    }
    frame += 1
    if (frame >= maxFrames) {
      options?.onGiveUp?.()
      return
    }
    rafId = window.requestAnimationFrame(tick)
  }

  rafId = window.requestAnimationFrame(tick)
  return () => window.cancelAnimationFrame(rafId)
}
