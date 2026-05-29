'use client'

import { useEffect, useId, useRef, useState } from 'react'
import VersePinGlyph from '@/components/VersePinGlyph'
import type { VerseBookmarkColorId, VersePinColorId } from '@/lib/versePinStorage'
import { VERSE_BOOKMARK_COLOR_IDS } from '@/lib/versePinStorage'

const SR_LABEL: Record<VersePinColorId, string> = {
  red: 'Red',
  blue: 'Blue',
  yellow: 'Yellow',
  green: 'Green',
  violet: 'Violet',
}

const triggerButtonClass =
  'inline-flex items-center gap-1 rounded-md border-2 h-9 min-h-[36px] px-2 box-border transition-colors shrink-0 ' +
  'border-slate-400 dark:border-slate-500 bg-slate-100 dark:bg-slate-700 ' +
  'text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-100 dark:disabled:hover:bg-slate-700'

const triggerButtonInteractiveClass = `${triggerButtonClass} cursor-pointer disabled:cursor-not-allowed`

const optionButtonClass =
  'flex items-center justify-center rounded px-2 py-2 min-h-[38px] w-full gap-2 ' +
  'hover:bg-slate-200 dark:hover:bg-slate-600 aria-selected:bg-slate-300/80 dark:aria-selected:bg-slate-600/80 ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500'

export interface ScriptureModalPinPickProps {
  reference: string
  draftColor: VersePinColorId
  onDraftColorChange: (value: VersePinColorId) => void
  colorsAvailableInDropdown: readonly VerseBookmarkColorId[]
  disabled: boolean
}

/** Pin color control: collapsible icon list (📌 tinted per slot) beside Memorize. No “none” — clear pins from the card or menu. */
export default function ScriptureModalPinPick({
  reference,
  draftColor,
  onDraftColorChange,
  colorsAvailableInDropdown,
  disabled,
}: ScriptureModalPinPickProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listboxId = useId()

  /** Which `reference` the listbox was opened for; clears automatically when `reference` prop changes. */
  const [dropdownForReference, setDropdownForReference] = useState<string | null>(null)
  const open = dropdownForReference !== null && dropdownForReference === reference

  const available = VERSE_BOOKMARK_COLOR_IDS.filter((id) => colorsAvailableInDropdown.includes(id))
  const canOpenMenu = available.length > 0

  useEffect(() => {
    if (!open) return
    const fn = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setDropdownForReference(null)
      }
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [open])

  useEffect(() => {
    if (!open) return
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDropdownForReference(null)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [open])

  const choose = (v: VerseBookmarkColorId) => {
    onDraftColorChange(v)
    setDropdownForReference(null)
    triggerRef.current?.focus()
  }

  return (
    <div ref={wrapRef} className="relative shrink-0 self-center" data-tour="scripture-modal-pin-color">
      <button
        ref={triggerRef}
        type="button"
        data-tour="scripture-modal-pin-trigger"
        disabled={disabled}
        aria-expanded={canOpenMenu ? open : false}
        aria-haspopup={canOpenMenu ? 'listbox' : undefined}
        aria-controls={canOpenMenu && open ? listboxId : undefined}
        aria-label={`Pin color: ${SR_LABEL[draftColor]}. ${canOpenMenu ? 'Open to pick another tinted pin.' : ''} Yellow tracks last verse when you close without changing pin.`.trim()}
        title={
          canOpenMenu
            ? 'Tap to choose a colored bookmark pin for this passage. Clear pins using the 📌 on the card or Clear pinned passages in the menu.'
            : 'Bookmark colors are in use elsewhere; closing still moves the yellow last-verse marker to this passage.'
        }
        className={triggerButtonInteractiveClass}
        onClick={() => !disabled && canOpenMenu && setDropdownForReference(open ? null : reference)}
      >
        <span className="flex items-center gap-0.5" aria-hidden>
          <span className="inline-flex h-5.5 w-5.5 items-center justify-center text-lg leading-none select-none">
            <VersePinGlyph colorId={draftColor} />
          </span>
        </span>
        {canOpenMenu && (
          <svg
            aria-hidden
            className="h-3 w-3 shrink-0 text-slate-500 dark:text-slate-400 mt-px"
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

      {open && canOpenMenu && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Pin color"
          className="absolute left-0 top-full z-110 mt-1 flex min-w-13 flex-col gap-0.5 rounded-md border-2 border-slate-400 dark:border-slate-500 bg-slate-50 p-1 shadow-lg dark:bg-slate-700"
        >
          {available.map((id) => (
            <button
              key={id}
              type="button"
              role="option"
              aria-selected={draftColor === id}
              aria-label={`${SR_LABEL[id]} pin`}
              data-pin-slot={id}
              className={`${optionButtonClass} cursor-pointer`}
              onClick={() => choose(id)}
            >
              <span className="text-xl leading-none" aria-hidden>
                <VersePinGlyph colorId={id} />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
