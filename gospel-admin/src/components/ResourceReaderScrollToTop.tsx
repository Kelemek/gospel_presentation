'use client'

import { useEffect, useState } from 'react'
import { isKindleBrowser } from '@/lib/kindleUserAgent'
import {
  isResourceReaderModalOverlayOpen,
  resourceReaderScrollOffset,
  resourceReaderViewportHeight,
  scrollResourceReaderToPageTop,
  shouldShowResourceReaderScrollToTop,
} from '@/lib/resourceReaderScrollToTop'

/**
 * Fixed back-to-top control for the shared profile reader.
 * Window scroll only. Kindle browsers and Kindle read mode do not use it.
 * z-30 stays under the sticky header (z-40) and modal overlays (z-50+).
 */
export default function ResourceReaderScrollToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isKindleBrowser()) return

    const syncVisibility = () => {
      const show = shouldShowResourceReaderScrollToTop(
        resourceReaderScrollOffset(),
        resourceReaderViewportHeight(),
        isResourceReaderModalOverlayOpen()
      )
      setVisible((current) => (current === show ? current : show))
    }

    syncVisibility()
    window.addEventListener('scroll', syncVisibility, { passive: true })
    window.addEventListener('resize', syncVisibility)

    const observer = new MutationObserver(syncVisibility)
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-modal'],
    })

    return () => {
      window.removeEventListener('scroll', syncVisibility)
      window.removeEventListener('resize', syncVisibility)
      observer.disconnect()
    }
  }, [])

  const onBackToTop = () => {
    scrollResourceReaderToPageTop()
    // Instant jumps may not emit a scroll event, so re-read the window position here.
    const show = shouldShowResourceReaderScrollToTop(
      resourceReaderScrollOffset(),
      resourceReaderViewportHeight(),
      isResourceReaderModalOverlayOpen()
    )
    setVisible((current) => (current === show ? current : show))
  }

  if (!visible) return null

  return (
    <button
      type="button"
      data-resource-reader-scroll-top
      onClick={onBackToTop}
      aria-label="Back to top"
      title="Back to top"
      className="print-hide fixed z-30 inline-flex h-11 w-11 min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full border border-slate-300 bg-white text-slate-800 shadow-md transition-colors hover:bg-slate-100 active:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 dark:active:bg-slate-600 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-slate-900 bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))]"
    >
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M5 15l7-7 7 7" />
      </svg>
    </button>
  )
}
