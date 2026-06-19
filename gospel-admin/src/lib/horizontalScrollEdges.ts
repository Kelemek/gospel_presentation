export type HorizontalScrollEdges = {
  canScroll: boolean
  showStart: boolean
  showEnd: boolean
}

/** Whether horizontal scroll fades should show at the start/end of a scroll container. */
export function getHorizontalScrollEdges(el: HTMLElement): HorizontalScrollEdges {
  const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth)
  if (maxScroll <= 1) {
    return { canScroll: false, showStart: false, showEnd: false }
  }

  return {
    canScroll: true,
    showStart: el.scrollLeft > 1,
    showEnd: el.scrollLeft < maxScroll - 1,
  }
}
