'use client'

import { useLayoutEffect, useRef, type MouseEvent } from 'react'
import { MemorizeListenSpeedButton } from '@/components/MemorizeListenSpeedButton'
import type { MemorizeListenSpeed } from '@/lib/memorizeListenSpeedStorage'

export interface MemorizeListenControlsDialogProps {
  open: boolean
  onClose: () => void
  /** Root element `id` for `aria-controls` on openers. */
  dialogId: string
  /** `h2` id for `aria-labelledby`. */
  titleId: string
  onPrimaryClick: () => void
  primaryLabel: string
  primaryAriaLabel: string
  primaryAriaPressed: boolean
  repeatListenOn: boolean
  onRepeatToggle: () => void
  listenPlaybackRate: MemorizeListenSpeed
  onSelectSpeed: (r: MemorizeListenSpeed) => void
}

/**
 * Read-aloud sub-dialog for memorize practice: play/pause, repeat, speed.
 * Rendered as a second fixed layer above the practice modal (`z-120`).
 */
export function MemorizeListenControlsDialog({
  open,
  onClose,
  dialogId,
  titleId,
  onPrimaryClick,
  primaryLabel,
  primaryAriaLabel,
  primaryAriaPressed,
  repeatListenOn,
  onRepeatToggle,
  listenPlaybackRate,
  onSelectSpeed,
}: MemorizeListenControlsDialogProps) {
  const backdropRef = useRef<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    if (!open) return
    const el = backdropRef.current
    if (!el) return
    /**
     * iOS / WebKit: dismissing a full-screen overlay with `onClick` alone can send a
     * retargeted `click` to the layer below, stealing focus and making the practice
     * field’s keyboard appear then vanish. Use a non-passive `touchstart` listener so
     * `preventDefault` suppresses that synthetic click; keep `onClick` for pointer/mouse.
     * (React’s delegated `touchstart` is passive in some cases, so we attach natively.)
     */
    const onTouchStart = (e: globalThis.TouchEvent) => {
      if (e.target !== el) return
      e.preventDefault()
      onClose()
    }
    el.addEventListener('touchstart', onTouchStart, { passive: false })
    return () => el.removeEventListener('touchstart', onTouchStart)
  }, [open, onClose])

  if (!open) {
    return null
  }

  const handleBackdropPointerClose = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    onClose()
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-120 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      role="presentation"
      onClick={handleBackdropPointerClose}
    >
      <div
        id={dialogId}
        className="relative w-full max-w-md rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 border-b border-slate-200 dark:border-slate-600 px-4 pt-3 pb-2">
          <h2
            id={titleId}
            className="text-lg font-semibold text-slate-900 dark:text-slate-100"
          >
            Read aloud
          </h2>
          <button
            type="button"
            data-tour="memorize-listen-close"
            onClick={onClose}
            className="shrink-0 text-slate-600 dark:text-slate-200 text-xl font-bold min-h-[36px] min-w-[36px] rounded-md flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-600"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="flex flex-col gap-3 p-4">
          <button
            type="button"
            data-testid="memorize-listen-passage"
            onClick={onPrimaryClick}
            className="w-full px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100"
            aria-pressed={primaryAriaPressed}
            aria-label={primaryAriaLabel}
          >
            {primaryLabel}
          </button>
          <div className="flex flex-wrap items-stretch gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              data-testid="memorize-listen-repeat"
              onClick={onRepeatToggle}
              className="min-w-0 flex-1 px-4 py-3 rounded-lg font-medium text-center transition-colors cursor-pointer border border-slate-300 dark:border-slate-600 data-[on=true]:bg-amber-50 data-[on=true]:dark:bg-amber-900/20 data-[on=true]:border-amber-300 data-[on=true]:dark:border-amber-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100"
              data-on={repeatListenOn ? 'true' : 'false'}
              aria-pressed={repeatListenOn}
              aria-label={
                repeatListenOn
                  ? 'Stop repeating the read-aloud after this play ends'
                  : 'Repeat the read-aloud with a short pause between each play'
              }
            >
              {repeatListenOn ? 'Repeat on' : 'Repeat'}
            </button>
            <MemorizeListenSpeedButton
              inline
              value={listenPlaybackRate}
              onSelect={onSelectSpeed}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
