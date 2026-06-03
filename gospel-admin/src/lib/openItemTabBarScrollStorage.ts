/** Session-persisted horizontal scroll for shared tab bars (survives profile route remounts). */

export const PROFILE_RESOURCE_TAB_BAR_SCROLL_KEY =
  'gospel-profile-resource-tabs-scroll-left:v1'

export const SCRIPTURE_MODAL_TAB_BAR_SCROLL_KEY =
  'gospel-scripture-modal-tabs-scroll-left:v1'

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
