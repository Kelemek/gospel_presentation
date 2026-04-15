/**
 * Scroll only the practice column so the active blank is vertically centered.
 * Used on Android instead of `scrollIntoView`, which can scroll outer ancestors and jump scroll on error flash.
 */
export function scrollMemorizeBlankIntoPracticeColumn(scrollEl: HTMLElement, el: HTMLElement): void {
  const scrollRect = scrollEl.getBoundingClientRect()
  const elRect = el.getBoundingClientRect()
  const elOffsetInScrollParent = elRect.top - scrollRect.top + scrollEl.scrollTop
  const targetTop = elOffsetInScrollParent - scrollEl.clientHeight / 2 + elRect.height / 2
  const maxScroll = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight)
  scrollEl.scrollTop = Math.max(0, Math.min(targetTop, maxScroll))
}
