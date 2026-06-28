/** Session-persisted horizontal scroll for shared tab bars (survives profile route remounts). */

export const PROFILE_RESOURCE_TAB_BAR_SCROLL_KEY =
  'gospel-profile-resource-tabs-scroll-left:v1'

export const SCRIPTURE_MODAL_TAB_BAR_SCROLL_KEY =
  'gospel-scripture-modal-tabs-scroll-left:v1'

/** Ask open tab bars to smooth-scroll the active tab into view when it is off-screen. */
export const REVEAL_ACTIVE_OPEN_ITEM_TAB_EVENT = 'gospel-reveal-active-open-item-tab'

export function dispatchRevealActiveOpenItemTab(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(REVEAL_ACTIVE_OPEN_ITEM_TAB_EVENT))
}

export function loadOpenItemTabBarScrollLeft(storageKey: string): number | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(storageKey)
    if (raw == null) return null
    const n = Number(raw)
    return Number.isFinite(n) && n >= 0 ? n : null
  } catch {
    return null
  }
}

export function saveOpenItemTabBarScrollLeft(storageKey: string, scrollLeft: number): void {
  if (typeof window === 'undefined') return
  if (!Number.isFinite(scrollLeft) || scrollLeft < 0) return
  try {
    window.sessionStorage.setItem(storageKey, String(scrollLeft))
  } catch {
    /* quota / private mode */
  }
}

/**
 * Save scroll position from user interaction (tab click). Always records the live value.
 */
export function captureOpenItemTabBarScroll(
  storageKey: string,
  scrollEl: HTMLElement | null | undefined
): void {
  if (!scrollEl) return
  saveOpenItemTabBarScrollLeft(storageKey, scrollEl.scrollLeft)
}

/**
 * Save on unmount/scroll-end without clobbering a good position when the DOM already reset to 0.
 */
export function persistOpenItemTabBarScrollOnRelease(
  storageKey: string,
  scrollEl: HTMLElement | null | undefined
): void {
  if (!scrollEl) return
  const left = scrollEl.scrollLeft
  if (left === 0) {
    const existing = loadOpenItemTabBarScrollLeft(storageKey)
    if (existing != null && existing > 0) return
  }
  saveOpenItemTabBarScrollLeft(storageKey, left)
}

export function clampTabBarScrollLeft(scrollEl: HTMLElement, scrollLeft: number): number {
  const max = Math.max(0, scrollEl.scrollWidth - scrollEl.clientWidth)
  return Math.min(Math.max(0, scrollLeft), max)
}

export function restoreOpenItemTabBarScrollPosition(
  scrollEl: HTMLElement,
  storageKey: string
): boolean {
  const saved = loadOpenItemTabBarScrollLeft(storageKey)
  if (saved == null) return false
  scrollEl.scrollLeft = clampTabBarScrollLeft(scrollEl, saved)
  return true
}

export type OpenItemTabScrollIntoViewOptions = {
  behavior?: ScrollBehavior
}

/** Whether the tab label row is fully visible inside the horizontal tab list viewport. */
export function isOpenItemTabVisibleInTabBar(
  scrollEl: HTMLElement,
  tabId: string
): boolean {
  const trimmed = tabId.trim()
  if (!trimmed) return true
  const tab = scrollEl.querySelector<HTMLElement>(
    `[data-open-item-tab-id="${CSS.escape(trimmed)}"]`
  )
  if (!tab) return true
  if (scrollEl.scrollWidth <= scrollEl.clientWidth + 1) return true
  const scrollRect = scrollEl.getBoundingClientRect()
  const tabRect = tab.getBoundingClientRect()
  const padding = 2
  return (
    tabRect.left >= scrollRect.left - padding && tabRect.right <= scrollRect.right + padding
  )
}

/** Scroll a tab row (label + close) fully into the horizontal tab list viewport. */
export function scrollOpenItemTabIntoView(
  scrollEl: HTMLElement,
  tabId: string,
  storageKey?: string,
  options?: OpenItemTabScrollIntoViewOptions
): boolean {
  const trimmed = tabId.trim()
  if (!trimmed) return false
  const tab = scrollEl.querySelector<HTMLElement>(
    `[data-open-item-tab-id="${CSS.escape(trimmed)}"]`
  )
  if (!tab) return false
  tab.scrollIntoView({
    block: 'nearest',
    inline: 'nearest',
    behavior: options?.behavior ?? 'auto',
  })
  if (storageKey) {
    saveOpenItemTabBarScrollLeft(storageKey, scrollEl.scrollLeft)
  }
  return true
}

/** Smooth-scroll the active tab into view when it is clipped by horizontal overflow. */
export function revealActiveOpenItemTabIfOffScreen(
  scrollEl: HTMLElement,
  tabId: string,
  storageKey?: string,
  options?: OpenItemTabScrollIntoViewOptions
): boolean {
  const trimmed = tabId.trim()
  if (!trimmed) return false
  if (scrollEl.scrollWidth <= scrollEl.clientWidth + 1) return false
  if (isOpenItemTabVisibleInTabBar(scrollEl, trimmed)) return false
  return scrollOpenItemTabIntoView(scrollEl, trimmed, storageKey, options)
}
