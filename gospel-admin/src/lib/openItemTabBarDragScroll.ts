/** Pointer movement before a press becomes tab-bar drag-scroll (not a tab click). */
export const OPEN_ITEM_TAB_BAR_DRAG_THRESHOLD_PX = 6

export type OpenItemTabBarDragSession = {
  pointerId: number
  startClientX: number
  startScrollLeft: number
  dragging: boolean
}

export function canOpenItemTabBarDragScroll(el: HTMLDivElement): boolean {
  return el.scrollWidth > el.clientWidth
}

export function shouldOpenItemTabBarDrag(
  el: HTMLDivElement,
  session: OpenItemTabBarDragSession,
  clientX: number
): boolean {
  if (session.dragging) return true
  if (!canOpenItemTabBarDragScroll(el)) return false
  return Math.abs(clientX - session.startClientX) >= OPEN_ITEM_TAB_BAR_DRAG_THRESHOLD_PX
}

export function scrollLeftForOpenItemTabBarDrag(
  session: OpenItemTabBarDragSession,
  clientX: number
): number {
  return session.startScrollLeft + (clientX - session.startClientX)
}

export function clampOpenItemTabBarScrollLeft(el: HTMLDivElement, scrollLeft: number): number {
  const max = Math.max(0, el.scrollWidth - el.clientWidth)
  return Math.max(0, Math.min(scrollLeft, max))
}

export type AttachOpenItemTabBarDragScrollOptions = {
  /** Ignore touch/pen so native horizontal pan still works on mobile (default true). */
  mouseOnly?: boolean
  onDragScroll?: (scrollLeft: number) => void
}

/**
 * Click-and-drag horizontal scroll on the tab list. Tab select/close clicks still work
 * when the pointer moves less than the drag threshold.
 */
export function attachOpenItemTabBarDragScroll(
  el: HTMLDivElement,
  options: AttachOpenItemTabBarDragScrollOptions = {}
): () => void {
  const { mouseOnly = true, onDragScroll } = options
  let session: OpenItemTabBarDragSession | null = null
  let suppressNextClick = false

  const clearDraggingUi = () => {
    el.removeAttribute('data-tab-bar-dragging')
  }

  const endSession = () => {
    session = null
    clearDraggingUi()
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerUp)
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!session || event.pointerId !== session.pointerId) return
    if (!shouldOpenItemTabBarDrag(el, session, event.clientX)) return

    if (!session.dragging) {
      session.dragging = true
      try {
        el.setPointerCapture(event.pointerId)
      } catch {
        /* unsupported in some test environments */
      }
      el.setAttribute('data-tab-bar-dragging', 'true')
    }

    event.preventDefault()
    const next = clampOpenItemTabBarScrollLeft(
      el,
      scrollLeftForOpenItemTabBarDrag(session, event.clientX)
    )
    el.scrollLeft = next
    onDragScroll?.(next)
  }

  const onPointerUp = (event: PointerEvent) => {
    if (!session || event.pointerId !== session.pointerId) return
    const wasDragging = session.dragging
    if (wasDragging) {
      suppressNextClick = true
      try {
        el.releasePointerCapture(event.pointerId)
      } catch {
        /* pointer may already be released */
      }
    }
    endSession()
  }

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return
    if (mouseOnly && event.pointerType !== 'mouse') return
    if (!canOpenItemTabBarDragScroll(el)) return

    session = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startScrollLeft: el.scrollLeft,
      dragging: false,
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
  }

  const onClickCapture = (event: MouseEvent) => {
    if (!suppressNextClick) return
    suppressNextClick = false
    event.preventDefault()
    event.stopPropagation()
  }

  el.addEventListener('pointerdown', onPointerDown)
  el.addEventListener('click', onClickCapture, true)

  return () => {
    endSession()
    el.removeEventListener('pointerdown', onPointerDown)
    el.removeEventListener('click', onClickCapture, true)
  }
}
