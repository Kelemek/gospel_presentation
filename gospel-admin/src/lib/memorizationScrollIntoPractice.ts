const MEMSCROLL_EDGE_MARGIN = 8

/**
 * Scroll the practice column only as much as needed so the blank stays in view.
 * On Android (with IME) this avoids centering math clamping to `maxScroll` and jumping to the verse bottom.
 */
export function scrollMemorizeBlankNearestInPracticeColumn(scrollEl: HTMLElement, el: HTMLElement): void {
  const scrollRect = scrollEl.getBoundingClientRect()
  const elRect = el.getBoundingClientRect()
  const maxScroll = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight)
  let next = scrollEl.scrollTop
  if (elRect.top < scrollRect.top + MEMSCROLL_EDGE_MARGIN) {
    next += elRect.top - scrollRect.top - MEMSCROLL_EDGE_MARGIN
  }
  if (elRect.bottom > scrollRect.bottom - MEMSCROLL_EDGE_MARGIN) {
    next += elRect.bottom - scrollRect.bottom + MEMSCROLL_EDGE_MARGIN
  }
  scrollEl.scrollTop = Math.max(0, Math.min(next, maxScroll))
}

/**
 * Scroll only the practice column so the active blank is vertically centered.
 * Used for tests / tooling; practice UI uses `scrollMemorizeBlankNearestInPracticeColumn` on Android.
 */
export function scrollMemorizeBlankIntoPracticeColumn(scrollEl: HTMLElement, el: HTMLElement): void {
  const scrollRect = scrollEl.getBoundingClientRect()
  const elRect = el.getBoundingClientRect()
  const elOffsetInScrollParent = elRect.top - scrollRect.top + scrollEl.scrollTop
  const targetTop = elOffsetInScrollParent - scrollEl.clientHeight / 2 + elRect.height / 2
  const maxScroll = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight)
  scrollEl.scrollTop = Math.max(0, Math.min(targetTop, maxScroll))
}
