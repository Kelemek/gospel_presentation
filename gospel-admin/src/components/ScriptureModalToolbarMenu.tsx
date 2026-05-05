'use client'

import { useEffect, useId, useRef, useState } from 'react'

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
  /** Primary accessible name for the trigger (e.g. tour / screen readers). */
  ariaLabel: string
  listboxAriaLabel: string
  /** Extra classes on the trigger (e.g. min width). */
  triggerClassName?: string
}

export default function ScriptureModalToolbarMenu({
  value,
  options,
  onSelect,
  disabled = false,
  dataTour,
  ariaLabel,
  listboxAriaLabel,
  triggerClassName = 'w-[6.5rem]',
}: ScriptureModalToolbarMenuProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listboxId = useId()
  const [open, setOpen] = useState(false)

  const selected = options.find((o) => o.value === value) ?? options[0]
  const canOpen = !disabled && options.length > 1

  useEffect(() => {
    if (!open) return
    const fn = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
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

  const choose = (v: string) => {
    void (async () => {
      await onSelect(v)
      setOpen(false)
      triggerRef.current?.focus()
    })()
  }

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

      {open && canOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={listboxAriaLabel}
          className="absolute left-0 top-full z-100 mt-1 flex min-w-full flex-col gap-0.5 rounded-md border-2 border-slate-400 p-1 shadow-lg dark:border-slate-500 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
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
      )}
    </div>
  )
}
