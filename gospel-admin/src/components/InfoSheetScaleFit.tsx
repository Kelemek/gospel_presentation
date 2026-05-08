'use client'

import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'

const XL_MIN = 1280

function subscribeMaxXl(callback: () => void) {
  const mq = window.matchMedia(`(max-width: ${XL_MIN - 1}px)`)
  mq.addEventListener('change', callback)
  return () => mq.removeEventListener('change', callback)
}

function getMaxXlSnapshot() {
  return typeof window !== 'undefined' ? window.matchMedia(`(max-width: ${XL_MIN - 1}px)`).matches : false
}

/** Inner size inside padding (clientWidth/Height exclude scrollbar, include padding in the usual box model sense). */
function getPaddedContentSize(el: HTMLElement) {
  const cs = getComputedStyle(el)
  const pt = parseFloat(cs.paddingTop) || 0
  const pr = parseFloat(cs.paddingRight) || 0
  const pb = parseFloat(cs.paddingBottom) || 0
  const pl = parseFloat(cs.paddingLeft) || 0
  return {
    cw: Math.max(0, el.clientWidth - pl - pr),
    ch: Math.max(0, el.clientHeight - pt - pb),
  }
}

/**
 * Below `xl`, scales the sheet column so all content fits the 5.5×8.5 frame without scrolling.
 * At `xl` and up, renders children in a plain flex column (no transform).
 *
 * Flex children that use `min-h-0` + `overflow-hidden` can shrink below their content; that
 * clips overflow without increasing `scrollHeight`, so the measured scale stays ~1 and content
 * stays cut off. Prefer `min-h-min` / visible overflow for the tall column so intrinsic height is real.
 */
export function InfoSheetScaleFit({ children }: { children: React.ReactNode }) {
  const sheetNarrow = useSyncExternalStore(subscribeMaxXl, getMaxXlSnapshot, () => false)

  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [layoutHeightPx, setLayoutHeightPx] = useState<number | null>(null)

  useLayoutEffect(() => {
    if (!sheetNarrow) return
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return

    const measure = () => {
      inner.style.transform = 'none'
      inner.style.width = ''
      inner.style.minHeight = ''
      inner.style.marginBottom = ''
      const { cw, ch } = getPaddedContentSize(outer)
      if (ch <= 0 || cw <= 0) return

      inner.style.width = `${cw}px`
      /* Fill padded slot between hero and QR; scale down if middle content is still taller. */
      inner.style.minHeight = `${ch}px`
      const ih = inner.scrollHeight
      const iw = inner.scrollWidth
      const s = Math.min(1, cw / iw, ch / ih)
      inner.style.transform = `scale(${s})`
      /* `top left` leaves all horizontal slack on the right when height limits `s`. `top center` keeps the scaled column centered so content meets the card edges symmetrically. */
      inner.style.transformOrigin = 'top center'
      /*
       * `transform: scale` doesn’t reduce layout height; a fixed-height + overflow:hidden wrapper
       * would clip the unscaled tail (~ih×(1−s)). Negative margin collapses that extra block space.
       */
      if (s < 1) {
        inner.style.marginBottom = `${ih * (s - 1)}px`
      }
      setLayoutHeightPx(Math.ceil(ih * s * 1000) / 1000)
    }

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(measure)
    })
    ro.observe(outer)
    measure()
    return () => ro.disconnect()
  }, [sheetNarrow])

  if (!sheetNarrow) {
    return (
      <div className="flex min-h-0 min-w-0 flex-col xl:h-full xl:min-h-0 xl:max-h-full xl:overflow-hidden">
        {children}
      </div>
    )
  }

  return (
    // Narrow sheet: `pt`/`pb` match `/info` hero `mb` + slate spacer so top/bottom gutters align.
    <div
      ref={outerRef}
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pt-2 pb-1.5 sm:pt-2.5 sm:pb-2"
    >
      <div
        className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden"
        style={
          layoutHeightPx !== null
            ? { height: `${layoutHeightPx}px`, flex: 'none' }
            : { minHeight: 0 }
        }
      >
        <div
          ref={innerRef}
          className="flex h-full min-h-0 w-full min-w-0 flex-col gap-y-0"
        >
          {children}
        </div>
      </div>
    </div>
  )
}
