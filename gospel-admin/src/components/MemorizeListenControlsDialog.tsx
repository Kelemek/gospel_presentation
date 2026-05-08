'use client'

import { useLayoutEffect, useRef, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { MemorizeListenSpeedButton } from '@/components/MemorizeListenSpeedButton'
import type { MemorizeListenSpeed } from '@/lib/memorizeListenSpeedStorage'
import type { ProfileReadAlongUnderlineStyle } from '@/lib/profileReadAlongUnderlineStyleStorage'

interface MemorizeListenControlsDialogPropsBase {
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
  listenPlaybackRate: MemorizeListenSpeed
  onSelectSpeed: (r: MemorizeListenSpeed) => void
  /** Profile read-aloud: optional word-underline toggle between Play and speed. */
  readAlongUnderlineOn?: boolean
  onToggleReadAlongUnderline?: () => void
  /** When underline is on: word vs full wrapped-line highlight. */
  readAlongUnderlineStyle?: ProfileReadAlongUnderlineStyle
  onReadAlongUnderlineStyle?: (style: ProfileReadAlongUnderlineStyle) => void
  /** Profile read-aloud only: clears saved resume position and restarts the section from the top. */
  onStartFromBeginning?: () => void
  /**
   * `modal` — centered card + dimmed backdrop (memorize practice).
   * `floating` — narrow bar near the top, no backdrop; page stays scrollable and interactive (profile read-aloud).
   */
  presentation?: 'modal' | 'floating'
}

export type MemorizeListenControlsDialogProps =
  | (MemorizeListenControlsDialogPropsBase & {
      /** Default: memorize practice layout — full-width Play, then Repeat + speed. */
      showRepeat?: true
      repeatListenOn: boolean
      onRepeatToggle: () => void
    })
  | (MemorizeListenControlsDialogPropsBase & {
      /** Profile body read-aloud: no Repeat; Play and speed share one row. */
      showRepeat: false
    })

function isRepeatVariant(
  props: MemorizeListenControlsDialogProps
): props is MemorizeListenControlsDialogPropsBase & {
  showRepeat?: true
  repeatListenOn: boolean
  onRepeatToggle: () => void
} {
  return props.showRepeat !== false
}

/** U + underline; when `on` is false, prohibition mark overlays (circle + slash). */
function ReadAlongUnderlineGlyph({ on }: { on: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      overflow="visible"
      className="w-6 h-6 shrink-0"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <g transform="translate(12 12) scale(0.82) translate(-12 -12)">
        <path
          d="M 7 3.5 L 7 12.5 C 7 15 9 16.5 12 16.5 C 15 16.5 17 15 17 12.5 L 17 3.5"
          stroke="currentColor"
          strokeWidth={1.35}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="nonScalingStroke"
        />
        <path
          d="M 5.5 20.5 L 18.5 20.5"
          stroke="currentColor"
          strokeWidth={1.35}
          strokeLinecap="round"
          vectorEffect="nonScalingStroke"
        />
      </g>
      {!on ? (
        <g
          stroke="#dc2626"
          strokeLinecap="round"
          transform="translate(12 12) scale(1.38) translate(-12 -12)"
        >
          <circle
            cx={12}
            cy={12}
            r={11.5}
            strokeWidth={1.1}
            vectorEffect="nonScalingStroke"
          />
          <path
            d="M 3.87 3.87 L 20.13 20.13"
            strokeWidth={1.1}
            vectorEffect="nonScalingStroke"
          />
        </g>
      ) : null}
    </svg>
  )
}

/**
 * Read-aloud sub-dialog: play/pause, optional repeat, speed.
 * Portaled to `document.body` so `position: fixed` is viewport-relative (ancestors with
 * `backdrop-filter` / `filter` would otherwise create a containing block — e.g. profile sticky header).
 */
export function MemorizeListenControlsDialog(props: MemorizeListenControlsDialogProps) {
  const {
    open,
    onClose,
    dialogId,
    titleId,
    onPrimaryClick,
    primaryLabel,
    primaryAriaLabel,
    primaryAriaPressed,
    listenPlaybackRate,
    onSelectSpeed,
    readAlongUnderlineOn,
    onToggleReadAlongUnderline,
    readAlongUnderlineStyle,
    onReadAlongUnderlineStyle,
    onStartFromBeginning,
    presentation = 'modal',
  } = props
  const repeatListenOn = isRepeatVariant(props) ? props.repeatListenOn : false
  const showRepeatControls = isRepeatVariant(props)
  const backdropRef = useRef<HTMLDivElement | null>(null)
  const isFloating = presentation === 'floating'

  useLayoutEffect(() => {
    if (!open || isFloating) return
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
  }, [open, onClose, isFloating])

  if (!open) {
    return null
  }

  const handleBackdropPointerClose = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    onClose()
  }

  const panel = (
      <div
        id={dialogId}
        className="relative w-full max-w-md rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl"
        role="dialog"
        aria-modal={isFloating ? false : true}
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1 border-b border-slate-200 dark:border-slate-600 px-4 pt-3 pb-2">
          <h2
            id={titleId}
            className="text-lg font-semibold text-slate-900 dark:text-slate-100 min-w-0"
          >
            Listen
          </h2>
          <div className="flex justify-center shrink-0 px-1">
            {!showRepeatControls && onStartFromBeginning ? (
              <button
                type="button"
                data-testid="memorize-listen-start-from-beginning"
                onClick={onStartFromBeginning}
                className="text-center text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 underline-offset-2 hover:underline py-1 whitespace-nowrap"
              >
                Start from beginning
              </button>
            ) : null}
          </div>
          <div className="flex justify-end">
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
        </div>
        <div className="flex flex-col gap-3 p-4">
          {showRepeatControls ? (
            <>
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
                  onClick={() => {
                    if (!isRepeatVariant(props)) return
                    props.onRepeatToggle()
                  }}
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
            </>
          ) : (
            <div className="flex flex-nowrap items-stretch gap-1.5 sm:gap-2 min-w-0 overflow-x-auto">
              <button
                type="button"
                data-testid="memorize-listen-passage"
                onClick={onPrimaryClick}
                className="min-w-0 min-h-12.5 flex-1 px-3 sm:px-4 rounded-lg font-medium text-center transition-colors cursor-pointer border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm sm:text-base shrink"
                aria-pressed={primaryAriaPressed}
                aria-label={primaryAriaLabel}
              >
                {primaryLabel}
              </button>
              {readAlongUnderlineOn !== undefined && onToggleReadAlongUnderline ? (
                <button
                  type="button"
                  data-testid="memorize-listen-read-along-underline"
                  onClick={onToggleReadAlongUnderline}
                  className="shrink-0 h-12.5 w-12.5 rounded-lg text-sm font-medium transition-colors cursor-pointer border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 inline-flex items-center justify-center"
                  data-on={readAlongUnderlineOn ? 'true' : 'false'}
                  aria-pressed={readAlongUnderlineOn}
                  aria-label={
                    readAlongUnderlineOn
                      ? 'Read-along underline while listening is on. Press to turn off.'
                      : 'Read-along underline while listening is off. Press to turn on.'
                  }
                  title={readAlongUnderlineOn ? 'Underline on (tap to hide)' : 'Underline off (tap to show)'}
                >
                  <span className="inline-flex items-center justify-center scale-90">
                    <ReadAlongUnderlineGlyph on={readAlongUnderlineOn} />
                  </span>
                </button>
              ) : null}
              {readAlongUnderlineOn &&
              onReadAlongUnderlineStyle &&
              readAlongUnderlineStyle !== undefined ? (
                <div
                  className="flex shrink-0 h-12.5 rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden divide-x divide-slate-300 dark:divide-slate-600"
                  role="group"
                  aria-label="Read-along highlight width"
                >
                  <button
                    type="button"
                    data-testid="memorize-listen-read-along-style-word"
                    onClick={() => onReadAlongUnderlineStyle('word')}
                    className={`px-2 sm:px-2.5 min-w-11 text-xs font-medium transition-colors ${
                      readAlongUnderlineStyle === 'word'
                        ? 'bg-amber-50 dark:bg-amber-900/25 text-amber-900 dark:text-amber-100'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                    aria-pressed={readAlongUnderlineStyle === 'word'}
                  >
                    Word
                  </button>
                  <button
                    type="button"
                    data-testid="memorize-listen-read-along-style-line"
                    onClick={() => onReadAlongUnderlineStyle('line')}
                    className={`px-2 sm:px-2.5 min-w-11 text-xs font-medium transition-colors ${
                      readAlongUnderlineStyle === 'line'
                        ? 'bg-amber-50 dark:bg-amber-900/25 text-amber-900 dark:text-amber-100'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                    aria-pressed={readAlongUnderlineStyle === 'line'}
                  >
                    Line
                  </button>
                </div>
              ) : null}
              <MemorizeListenSpeedButton
                inline
                value={listenPlaybackRate}
                onSelect={onSelectSpeed}
              />
            </div>
          )}
        </div>
      </div>
  )

  const overlay = isFloating ? (
    <div className="fixed inset-x-0 top-0 z-120 flex justify-center px-4 pb-2 pointer-events-none pt-[calc(env(safe-area-inset-top,0px)+3.5rem)]">
      <div className="pointer-events-auto w-full max-w-md">{panel}</div>
    </div>
  ) : (
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
      {panel}
    </div>
  )

  return createPortal(overlay, document.body)
}
