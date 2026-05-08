'use client'

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import {
  MEMORIZE_LISTEN_SPEEDS,
  type MemorizeListenSpeed,
  formatMemorizeListenSpeedLabel,
} from '@/lib/memorizeListenSpeedStorage'

/** Matches `MemorizeListenControlsDialog` Play / Word–Line row: `rounded-lg`, 1px slate border. */
const triggerButtonClass =
  'inline-flex items-center gap-1 rounded-lg box-border transition-colors shrink-0 font-medium ' +
  'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 ' +
  'text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-slate-800'

const triggerButtonInteractiveClass = `${triggerButtonClass} cursor-pointer disabled:cursor-not-allowed`

/** Option rows aligned with Word/Line segment buttons inside the same dialog. */
const optionButtonClass =
  'flex items-center justify-start rounded-md px-2 py-2 min-h-[38px] w-full gap-2 text-sm font-medium transition-colors ' +
  'text-slate-700 dark:text-slate-200 ' +
  'hover:bg-slate-50 dark:hover:bg-slate-700 ' +
  'aria-selected:bg-amber-50 dark:aria-selected:bg-amber-900/25 aria-selected:text-amber-900 dark:aria-selected:text-amber-100 ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500'

export interface MemorizeListenSpeedButtonProps {
  value: MemorizeListenSpeed
  onSelect: (rate: MemorizeListenSpeed) => void
  /** @deprecated All options are shown in the menu; kept for API compatibility. */
  showCurrentOnTrigger?: boolean
  /** When true, root and trigger size to content (e.g. beside Repeat on one row). */
  inline?: boolean
}

/**
 * Read-aloud speed presets as a custom listbox (button + options). Borders and fills match the
 * Listen dialog row (`MemorizeListenControlsDialog`). Menu is portaled with fixed positioning so it
 * is not clipped by overflow on the listen row.
 */
export function MemorizeListenSpeedButton({
  value,
  onSelect,
  inline = false,
}: MemorizeListenSpeedButtonProps) {
  const listboxId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{
    left: number
    top: number
    minWidth: number
  }>({ left: 0, top: 0, minWidth: 0 })

  const options = MEMORIZE_LISTEN_SPEEDS
  const canOpen = options.length > 1
  const selectedLabel = formatMemorizeListenSpeedLabel(value)

  const triggerSizeClass = inline
    ? 'h-12.5 min-h-[50px] px-2.5'
    : 'h-9 min-h-[36px] px-2 w-full justify-between sm:w-auto sm:min-w-[5.5rem]'

  const ariaLabel = `Read-aloud speed, currently ${selectedLabel}. Choose a different speed.`

  useLayoutEffect(() => {
    if (!open || typeof window === 'undefined') return

    const updatePosition = () => {
      const t = triggerRef.current
      const m = menuRef.current
      if (!t) return
      const r = t.getBoundingClientRect()
      const menuW = m?.offsetWidth ?? Math.max(r.width, 140)
      const menuH = m?.offsetHeight ?? 0
      const pad = 8
      let left = r.left
      let top = r.bottom + 4
      if (left + menuW > window.innerWidth - pad) {
        left = Math.max(pad, window.innerWidth - menuW - pad)
      }
      if (
        menuH > 0 &&
        top + menuH > window.innerHeight - pad &&
        r.top > menuH + pad
      ) {
        top = Math.max(pad, r.top - menuH - 4)
      }
      setMenuPos({ left, top, minWidth: r.width })
    }

    updatePosition()
    const raf = requestAnimationFrame(updatePosition)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const fn = (e: MouseEvent) => {
      const n = e.target as Node
      if (triggerRef.current?.contains(n) || menuRef.current?.contains(n)) {
        return
      }
      setOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [open])

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

  const choose = (rate: MemorizeListenSpeed) => {
    onSelect(rate)
    setOpen(false)
    triggerRef.current?.focus()
  }

  const listbox =
    open && canOpen && typeof document !== 'undefined' ? (
      <div
        ref={menuRef}
        id={listboxId}
        role="listbox"
        aria-label="Read-aloud speed options"
        style={{
          position: 'fixed',
          left: menuPos.left,
          top: menuPos.top,
          minWidth: menuPos.minWidth,
          zIndex: 200,
        }}
        className="flex min-w-32 flex-col gap-0.5 rounded-lg border border-slate-300 bg-white p-1 shadow-lg dark:border-slate-600 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
      >
        {options.map((rate) => (
          <button
            key={String(rate)}
            type="button"
            role="option"
            data-testid={`memorize-listen-speed-option-${rate}`}
            aria-selected={rate === value}
            className={`${optionButtonClass} cursor-pointer`}
            onClick={() => choose(rate)}
          >
            {formatMemorizeListenSpeedLabel(rate)}
          </button>
        ))}
      </div>
    ) : null

  return (
    <div
      className={
        inline
          ? 'relative w-max min-w-0 max-w-full shrink-0 self-center'
          : 'relative w-full min-w-0 sm:w-auto'
      }
    >
      <button
        ref={triggerRef}
        type="button"
        data-testid="memorize-listen-speed"
        aria-expanded={canOpen ? open : false}
        aria-haspopup={canOpen ? 'listbox' : undefined}
        aria-controls={canOpen && open ? listboxId : undefined}
        aria-label={ariaLabel}
        title={canOpen ? `${ariaLabel} Tap to open.` : ariaLabel}
        className={`${triggerButtonInteractiveClass} ${triggerSizeClass} justify-between`}
        onClick={() => canOpen && setOpen((o) => !o)}
      >
        <span className="truncate text-left text-sm font-medium leading-none">
          {selectedLabel}
        </span>
        {canOpen ? (
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
        ) : null}
      </button>
      {listbox ? createPortal(listbox, document.body) : null}
    </div>
  )
}
