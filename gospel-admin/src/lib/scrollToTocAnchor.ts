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

/** CSS custom property the sticky header's inline `top` adds on top of the safe-area inset. */
export const STICKY_HEADER_KEYBOARD_OFFSET_VAR = '--profile-sticky-kbd-offset'

/** Moves the fixed notch/safe-area gradient bar with the iOS visual viewport (keyboard open). */
export const SAFE_AREA_BAR_OFFSET_VAR = '--profile-safe-area-bar-offset'

/** Set when the profile sticky header is pinned with the keyboard open (gap-fill above menu). */
export const STICKY_HEADER_GAP_FILL_ATTR = 'data-sticky-header-gap-fill'

/** iOS search keyboard: header uses fixed positioning instead of sticky (avoids sticky + top fighting). */
export const STICKY_HEADER_KEYBOARD_FIXED_ATTR = 'data-sticky-header-keyboard-fixed'

export const STICKY_HEADER_SPACER_ATTR = 'data-profile-sticky-header-spacer'

/** Tracks last applied keyboard offset so we skip redundant style writes (reduces iOS scroll jitter). */
const STICKY_HEADER_APPLIED_OFFSET_ATTR = 'data-profile-sticky-kbd-offset-applied'

function ensureIosKeyboardHeaderSpacer(header: HTMLElement): HTMLDivElement {
  const prev = header.previousElementSibling
  if (prev instanceof HTMLDivElement && prev.hasAttribute(STICKY_HEADER_SPACER_ATTR)) {
    return prev
  }
  const spacer = document.createElement('div')
  spacer.setAttribute(STICKY_HEADER_SPACER_ATTR, '')
  spacer.setAttribute('aria-hidden', 'true')
  header.parentElement?.insertBefore(spacer, header)
  return spacer
}

function updateIosKeyboardHeaderSpacer(header: HTMLElement): void {
  const spacer = ensureIosKeyboardHeaderSpacer(header)
  const height = `${header.offsetHeight}px`
  if (spacer.style.height !== height) {
    spacer.style.height = height
  }
}

/** Sticky + live `top` updates fight on iOS when the keyboard is open; use fixed for search instead. */
function ensureIosKeyboardHeaderFixed(header: HTMLElement): void {
  if (header.hasAttribute(STICKY_HEADER_KEYBOARD_FIXED_ATTR)) return
  updateIosKeyboardHeaderSpacer(header)
  header.setAttribute(STICKY_HEADER_KEYBOARD_FIXED_ATTR, '')
  header.style.position = 'fixed'
  header.style.left = '0'
  header.style.right = '0'
  header.style.width = '100%'
}

function releaseIosKeyboardHeaderFixed(header: HTMLElement): void {
  if (!header.hasAttribute(STICKY_HEADER_KEYBOARD_FIXED_ATTR)) return
  header.removeAttribute(STICKY_HEADER_KEYBOARD_FIXED_ATTR)
  header.style.removeProperty('position')
  header.style.removeProperty('left')
  header.style.removeProperty('right')
  header.style.removeProperty('width')
  const prev = header.previousElementSibling
  if (prev instanceof HTMLElement && prev.hasAttribute(STICKY_HEADER_SPACER_ATTR)) {
    prev.remove()
  }
}

/** Debounced trailing sync after visualViewport scroll (ms). */
const IOS_VV_SCROLL_DEBOUNCE_MS = 80

/** Window scroll treated as active until this long after the last scroll event (ms). */
const IOS_WINDOW_SCROLL_IDLE_MS = 150

/**
 * iOS-only search keyboard pin: switch the profile header to `position: fixed` and track
 * `visualViewport.offsetTop` so it stays at the top of the visible area above the keyboard.
 * `interactiveWidget: resizes-content` alone is not enough on iOS Safari / WKWebView.
 */
export function applyStickyHeaderVisualViewportTop(
  header: HTMLElement,
  viewport: { offsetTop: number } | null | undefined
): number {
  const offsetTop = Math.max(0, Math.round(viewport?.offsetTop ?? 0))

  ensureIosKeyboardHeaderFixed(header)

  const previous = header.getAttribute(STICKY_HEADER_APPLIED_OFFSET_ATTR)
  if (previous === String(offsetTop)) {
    return offsetTop
  }
  header.setAttribute(STICKY_HEADER_APPLIED_OFFSET_ATTR, String(offsetTop))

  updateIosKeyboardHeaderSpacer(header)
  header.style.setProperty(STICKY_HEADER_KEYBOARD_OFFSET_VAR, `${offsetTop}px`)
  header.style.top = `calc(env(safe-area-inset-top, 0px) + ${offsetTop}px)`
  document.body?.style.setProperty(SAFE_AREA_BAR_OFFSET_VAR, `${offsetTop}px`)

  if (offsetTop > 0) {
    header.setAttribute(STICKY_HEADER_GAP_FILL_ATTR, '')
  } else {
    header.removeAttribute(STICKY_HEADER_GAP_FILL_ATTR)
  }

  return offsetTop
}

/** Clears iOS visual-viewport chrome (ProfileContent effect cleanup). */
export function clearProfileIosVisualViewportChrome(header: HTMLElement | null | undefined): void {
  if (header) {
    releaseIosKeyboardHeaderFixed(header)
    header.style.removeProperty(STICKY_HEADER_KEYBOARD_OFFSET_VAR)
    header.style.removeProperty('top')
    header.removeAttribute(STICKY_HEADER_GAP_FILL_ATTR)
    header.removeAttribute(STICKY_HEADER_APPLIED_OFFSET_ATTR)
  }
  document.body?.style.removeProperty(SAFE_AREA_BAR_OFFSET_VAR)
}

/**
 * Apply or clear iOS visual-viewport chrome. Only active while the in-page search input is focused
 * (keyboard open); otherwise sticky `top` stays at the safe-area inset so the site title scrolls
 * away and the menu sticks normally.
 */
export function syncProfileIosVisualViewportChrome(
  header: HTMLElement,
  viewport: { offsetTop: number } | null | undefined,
  searchInputFocused: boolean
): void {
  if (searchInputFocused) {
    applyStickyHeaderVisualViewportTop(header, viewport)
  } else {
    clearProfileIosVisualViewportChrome(header)
  }
}

type VisualViewportLike = {
  addEventListener: VisualViewport['addEventListener']
  removeEventListener: VisualViewport['removeEventListener']
  offsetTop: number
}

/**
 * iOS in-page search keyboard: sync profile header to visualViewport with scroll gating.
 * During window scroll momentum (including direction reversals), visualViewport.offsetTop
 * oscillates briefly — skip vv.scroll/resize updates until scroll settles, then snap once.
 */
export function bindProfileIosKeyboardHeaderSync(options: {
  header: HTMLElement
  viewport: VisualViewportLike
  isSearchFocused: () => boolean
}): () => void {
  const { header, viewport: vv, isSearchFocused } = options
  let rafId = 0
  let vvScrollDebounceTimer = 0
  let windowScrollIdleTimer = 0
  let windowScrolling = false

  const syncNow = () => {
    cancelAnimationFrame(rafId)
    rafId = requestAnimationFrame(() => {
      syncProfileIosVisualViewportChrome(header, vv, isSearchFocused())
    })
  }

  const onWindowScrollEnd = () => {
    windowScrolling = false
    window.clearTimeout(windowScrollIdleTimer)
    syncNow()
  }

  const onWindowScroll = () => {
    windowScrolling = true
    window.clearTimeout(windowScrollIdleTimer)
    window.clearTimeout(vvScrollDebounceTimer)
    windowScrollIdleTimer = window.setTimeout(onWindowScrollEnd, IOS_WINDOW_SCROLL_IDLE_MS)
  }

  const onVvResize = () => {
    if (windowScrolling) return
    syncNow()
  }

  const onVvScroll = () => {
    if (windowScrolling) return
    window.clearTimeout(vvScrollDebounceTimer)
    vvScrollDebounceTimer = window.setTimeout(syncNow, IOS_VV_SCROLL_DEBOUNCE_MS)
  }

  vv.addEventListener('resize', onVvResize)
  vv.addEventListener('scroll', onVvScroll)
  window.addEventListener('scroll', onWindowScroll, { passive: true })
  if ('onscrollend' in window) {
    window.addEventListener('scrollend', onWindowScrollEnd, { passive: true })
  }

  syncNow()

  return () => {
    cancelAnimationFrame(rafId)
    window.clearTimeout(vvScrollDebounceTimer)
    window.clearTimeout(windowScrollIdleTimer)
    vv.removeEventListener('resize', onVvResize)
    vv.removeEventListener('scroll', onVvScroll)
    window.removeEventListener('scroll', onWindowScroll)
    if ('onscrollend' in window) {
      window.removeEventListener('scrollend', onWindowScrollEnd)
    }
    clearProfileIosVisualViewportChrome(header)
  }
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
