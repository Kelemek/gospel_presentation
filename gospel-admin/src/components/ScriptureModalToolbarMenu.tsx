'use client'

import { createPortal } from 'react-dom'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

const triggerButtonClass =
  'inline-flex items-center gap-1 rounded-md border-2 h-9 min-h-[36px] px-2 box-border transition-colors shrink-0 ' +
  'border-slate-400 dark:border-slate-500 bg-slate-100 dark:bg-slate-700 ' +
  'text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-100 dark:disabled:hover:bg-slate-700'

const triggerButtonInteractiveClass = `${triggerButtonClass} cursor-pointer disabled:cursor-not-allowed`

const optionButtonClass =
  'flex items-center justify-start rounded px-2 py-2 min-h-[38px] w-full gap-2 text-sm font-medium ' +
  'text-slate-800 dark:text-slate-200 ' +
  'hover:bg-slate-200 dark:hover:bg-slate-600 aria-selected:bg-slate-300/80 dark:aria-selected:bg-slate-600/80 ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500'

const VIEWPORT_PAD_PX = 8
const LISTBOX_GAP_PX = 4

export type PortalListboxPlacement = {
  top: number
  left: number
  minWidth: number
  maxHeight?: number
}

/**
 * Viewport placement for fixed portaled listbox: opens below the trigger when there is room;
 * otherwise grows **upward** from the trigger (instead of a very short, hard-to-use panel below).
 * Exported for unit tests.
 */
export function computePortalListboxPlacement(
  trigger: DOMRectReadOnly,
  listbox: HTMLElement,
  gap: number = LISTBOX_GAP_PX,
  pad: number = VIEWPORT_PAD_PX
): PortalListboxPlacement {
  const innerH = window.innerHeight
  const remPx = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  const cap = Math.min(innerH * 0.5, 22 * remPx)
  const contentH = listbox.scrollHeight
  const left = trigger.left
  const minWidth = trigger.width

  const spaceBelow = innerH - trigger.bottom - gap - pad
  const intendedH = Math.min(contentH, cap)
  const wouldExtendPastBottom = intendedH > spaceBelow + 0.5

  if (!wouldExtendPastBottom) {
    return {
      top: trigger.bottom + gap,
      left,
      minWidth,
      maxHeight: contentH > cap + 0.5 ? cap : undefined,
    }
  }

  const spaceAbove = trigger.top - gap - pad
  const maxPanel = Math.min(cap, Math.max(0, spaceAbove))
  let panelH = Math.min(contentH, maxPanel)
  let top = trigger.top - gap - panelH
  if (top < pad) {
    top = pad
    panelH = Math.min(contentH, Math.max(0, trigger.top - gap - top))
  }

  return {
    top,
    left,
    minWidth,
    maxHeight: contentH > panelH + 0.5 ? panelH : undefined,
  }
}

export interface ScriptureModalToolbarMenuOption {
  value: string
  label: string
}

export interface ScriptureModalToolbarMenuProps {
  value: string
  options: ScriptureModalToolbarMenuOption[]
  onSelect: (value: string) => void | Promise<void>
  disabled?: boolean
  dataTour?: string
  /** Optional stable selector for tour automation (listbox may portal to `body`). */
  listboxDataTour?: string
  /** Primary accessible name for the trigger (e.g. tour / screen readers). */
  ariaLabel: string
  listboxAriaLabel: string
  /** Extra classes on the trigger (e.g. min width). */
  triggerClassName?: string
  /**
   * When true, the listbox is rendered in a `document.body` portal with `position: fixed` so it is not
   * clipped by `overflow: hidden` ancestors (e.g. memorize practice dialog).
   */
  portaledListbox?: boolean
}

export default function ScriptureModalToolbarMenu({
  value,
  options,
  onSelect,
  disabled = false,
  dataTour,
  listboxDataTour,
  ariaLabel,
  listboxAriaLabel,
  triggerClassName = 'w-[6.5rem]',
  portaledListbox = false,
}: ScriptureModalToolbarMenuProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listboxPortalRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()
  const [open, setOpen] = useState(false)
  const [portalPlacement, setPortalPlacement] = useState<PortalListboxPlacement | null>(null)

  const selected = options.find((o) => o.value === value) ?? options[0]
  const canOpen = !disabled && options.length > 1

  useLayoutEffect(() => {
    if (!open || !portaledListbox || !canOpen) {
      queueMicrotask(() => {
        setPortalPlacement(null)
      })
      return
    }
    let raf = 0
    const measure = () => {
      const el = triggerRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const lb = listboxPortalRef.current
      if (lb) {
        window.cancelAnimationFrame(raf)
        raf = 0
        setPortalPlacement((prev) => {
          const next = computePortalListboxPlacement(r, lb)
          if (
            prev &&
            prev.top === next.top &&
            prev.left === next.left &&
            prev.minWidth === next.minWidth &&
            prev.maxHeight === next.maxHeight
          ) {
            return prev
          }
          return next
        })
      } else {
        setPortalPlacement((prev) => {
          const next = { top: r.bottom + LISTBOX_GAP_PX, left: r.left, minWidth: r.width }
          if (prev && prev.top === next.top && prev.left === next.left && prev.minWidth === next.minWidth) {
            return prev
          }
          return next
        })
        window.cancelAnimationFrame(raf)
        raf = window.requestAnimationFrame(measure)
      }
    }
    measure()
    window.addEventListener('resize', measure)
    const interval = window.setInterval(measure, 120)
    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
      window.clearInterval(interval)
    }
  }, [open, portaledListbox, canOpen])

  useEffect(() => {
    if (!open) return
    const fn = (e: MouseEvent) => {
      const t = e.target as Node
      if (wrapRef.current?.contains(t)) return
      if (portaledListbox && listboxPortalRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [open, portaledListbox])

  useEffect(() => {
    if (!open) return
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [open])

  const choose = (v: string) => {
    void (async () => {
      await onSelect(v)
      setOpen(false)
      triggerRef.current?.focus()
    })()
  }

  const listboxClassName = portaledListbox
    ? 'fixed z-[105] flex min-w-0 flex-col gap-0.5 rounded-md border-2 border-slate-400 p-1 shadow-lg dark:border-slate-500 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200 max-h-[min(50vh,22rem)] overflow-y-auto overscroll-y-contain'
    : 'absolute left-0 top-full z-100 mt-1 flex min-w-full flex-col gap-0.5 rounded-md border-2 border-slate-400 p-1 shadow-lg dark:border-slate-500 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200'

  const listboxNode =
    open && canOpen && (!portaledListbox || portalPlacement !== null) ? (
      <div
        ref={portaledListbox ? listboxPortalRef : undefined}
        id={listboxId}
        role="listbox"
        data-tour={listboxDataTour}
        aria-label={listboxAriaLabel}
        className={listboxClassName}
        style={
          portaledListbox && portalPlacement
            ? {
                top: portalPlacement.top,
                left: portalPlacement.left,
                minWidth: portalPlacement.minWidth,
                ...(portalPlacement.maxHeight !== undefined
                  ? { maxHeight: portalPlacement.maxHeight }
                  : {}),
              }
            : undefined
        }
      >
        {options.map((opt) => (
          <button
            key={opt.value === '' ? '__none__' : opt.value}
            type="button"
            role="option"
            aria-selected={opt.value === value}
            className={`${optionButtonClass} cursor-pointer`}
            onClick={() => choose(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    ) : null

  return (
    <div ref={wrapRef} className="relative shrink-0 self-center">
      <button
        ref={triggerRef}
        type="button"
        data-tour={dataTour}
        disabled={disabled}
        aria-expanded={canOpen ? open : false}
        aria-haspopup={canOpen ? 'listbox' : undefined}
        aria-controls={canOpen && open ? listboxId : undefined}
        aria-label={ariaLabel}
        title={canOpen ? `${ariaLabel}. Tap to open.` : ariaLabel}
        className={`${triggerButtonInteractiveClass} ${triggerClassName} justify-between`}
        onClick={() => !disabled && canOpen && setOpen((o) => !o)}
      >
        <span className="truncate text-left text-sm font-medium leading-none text-slate-800 dark:text-slate-200">
          {selected?.label ?? ''}
        </span>
        {canOpen && (
          <svg
            aria-hidden
            className={`h-3 w-3 shrink-0 text-slate-500 dark:text-slate-400 mt-px transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 20 20"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="m6 8 4 4 4-4"
            />
          </svg>
        )}
      </button>

      {portaledListbox && listboxNode && typeof document !== 'undefined'
        ? createPortal(listboxNode, document.body)
        : !portaledListbox
          ? listboxNode
          : null}
    </div>
  )
}
