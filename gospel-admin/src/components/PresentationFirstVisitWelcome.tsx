'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { runFullProfileHelpTutorial } from '@/lib/profileHelpTours'
import {
  dismissPresentationWelcome,
  hasPresentationWelcomeBeenDismissed,
} from '@/lib/presentationWelcomeStorage'
import { usePostHogModalOpen } from '@/hooks/usePostHogModalOpen'

const HELP_TRIGGER_ID = 'profile-help-menu-trigger'

function pulseHelpTriggerBriefly(): void {
  const el = document.getElementById(HELP_TRIGGER_ID)
  if (!el) return
  el.classList.add('profile-help-welcome-highlight')
  window.setTimeout(() => {
    el.classList.remove('profile-help-welcome-highlight')
  }, 12000)
}

/**
 * One-time welcome on first gospel profile view: offers **Full walkthrough** or dismiss.
 * Persists via `presentationWelcomeStorage`; after dismiss-only, briefly highlights the Help (?) control.
 */
export default function PresentationFirstVisitWelcome() {
  const [show, setShow] = useState(false)
  usePostHogModalOpen('presentation_welcome', show)
  const primaryRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (hasPresentationWelcomeBeenDismissed()) return
    const id = window.requestAnimationFrame(() => setShow(true))
    return () => window.cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    if (!show) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [show])

  useEffect(() => {
    if (!show) return
    const t = window.setTimeout(() => primaryRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [show])

  useEffect(() => {
    if (!show) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault()
        dismissPresentationWelcome()
        setShow(false)
        window.requestAnimationFrame(() => pulseHelpTriggerBriefly())
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [show])

  const handleStartWalkthrough = (): void => {
    dismissPresentationWelcome()
    setShow(false)
    window.requestAnimationFrame(() => {
      runFullProfileHelpTutorial()
    })
  }

  const handleClose = (): void => {
    dismissPresentationWelcome()
    setShow(false)
    window.requestAnimationFrame(() => pulseHelpTriggerBriefly())
  }

  if (!show || typeof document === 'undefined') return null

  return createPortal(
    // Dimming lives on this `fixed inset-0` node so the full viewport is always covered (inner-only bg failed in Safari / when flex height collapsed).
    <div
      className="presentation-first-visit-welcome-root print-hide fixed inset-0 z-60 overflow-y-auto overflow-x-hidden overscroll-y-contain bg-slate-950/60 dark:bg-slate-950/75"
      style={{ WebkitOverflowScrolling: 'touch' }}
      role="presentation"
      onClick={handleClose}
    >
      <div
        className="grid min-h-dvh w-full place-items-center pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(1rem,env(safe-area-inset-top))]"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="presentation-first-visit-welcome-title"
          className="isolate my-4 w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-600 dark:bg-slate-800"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="max-h-[min(70dvh,24rem)] overflow-y-auto overscroll-contain border-b border-slate-200 px-5 py-4 dark:border-slate-600 sm:max-h-none">
            <h2
              id="presentation-first-visit-welcome-title"
              className="text-lg font-semibold text-slate-900 dark:text-slate-100"
            >
              Welcome
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              This site walks through <strong>The Gospel in its Context</strong> with scripture, questions, and
              tools in the header. New here? Start the <strong>full walkthrough</strong> for a guided tour of
              theme, header controls (Share, bookmarks, Highlights, Listen when available), slide-out menu topics,
              scripture, and more—or close and open <strong>Help</strong> (
              <span className="whitespace-nowrap">?</span> in the header) anytime and choose{' '}
              <strong>Full walkthrough</strong> from the list.
            </p>
          </div>
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              className="w-full min-h-[48px] rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 dark:border-slate-500 dark:bg-slate-700/50 dark:text-slate-100 dark:hover:bg-slate-700 dark:focus-visible:ring-slate-500 dark:focus-visible:ring-offset-slate-800 sm:order-1 sm:w-auto sm:min-w-28"
              onClick={handleClose}
            >
              Close
            </button>
            <button
              ref={primaryRef}
              type="button"
              className="w-full min-h-[48px] rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800 sm:order-2 sm:w-auto sm:min-w-48"
              onClick={handleStartWalkthrough}
            >
              Start full walkthrough
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
