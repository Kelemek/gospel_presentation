'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import HighlightMarkerIcon from '@/components/HighlightMarkerIcon'
import {
  scriptureModalColorPickerOptionButtonClass,
  scriptureModalColorPickerTriggerInteractiveClass,
} from '@/components/scriptureModalColorPickerTrigger'
import {
  getScriptureHighlightForReference,
  toggleScriptureHighlight,
} from '@/lib/profileHighlightsStorage'
import {
  SCRIPTURE_HIGHLIGHT_COLOR_IDS,
  type ScriptureHighlightColorId,
} from '@/lib/scriptureHighlightStyles'
import { stripScriptureForMemorization } from '@/lib/verseMemorizationStorage'

const SR_LABEL: Record<ScriptureHighlightColorId, string> = {
  red: 'Red',
  blue: 'Blue',
  yellow: 'Yellow',
  green: 'Green',
  violet: 'Violet',
}

const triggerButtonInteractiveClass = scriptureModalColorPickerTriggerInteractiveClass

const optionButtonClass = scriptureModalColorPickerOptionButtonClass

export interface ScriptureModalHighlightPickProps {
  /** Tab reference used for save/lookup (verse, range, or chapter-only — never chapter-expanded). */
  reference: string
  /** Passage text for quote snapshot (raw API text for the tab scope, not full chapter context). */
  passageText: string
  profileSlug?: string
  disabled: boolean
  /** Parent revision counter to reload current highlight after external changes. */
  highlightsRevision?: number
  onChanged?: () => void
}

/** Highlight color control for Bible Reader / passage picker flows. */
export default function ScriptureModalHighlightPick({
  reference,
  passageText,
  profileSlug,
  disabled,
  highlightsRevision = 0,
  onChanged,
}: ScriptureModalHighlightPickProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listboxId = useId()

  const [dropdownForReference, setDropdownForReference] = useState<string | null>(null)
  const open = dropdownForReference !== null && dropdownForReference === reference

  const currentColorId = useMemo((): ScriptureHighlightColorId | null => {
    void highlightsRevision
    return getScriptureHighlightForReference(reference)?.colorId ?? null
  }, [reference, highlightsRevision])

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

  const choose = (colorId: ScriptureHighlightColorId) => {
    const quote = stripScriptureForMemorization(passageText).slice(0, 400)
    const saved = toggleScriptureHighlight({
      reference,
      quote: quote || reference,
      colorId,
      ...(profileSlug ? { profileSlug } : {}),
    })
    void saved
    onChanged?.()
    setDropdownForReference(null)
    triggerRef.current?.focus()
  }

  const colorLabel = currentColorId ? SR_LABEL[currentColorId] : 'None'

  return (
    <div ref={wrapRef} className="relative shrink-0 self-center" data-tour="scripture-modal-highlight-color">
      <button
        ref={triggerRef}
        type="button"
        data-tour="scripture-modal-highlight-trigger"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-label={`Highlight color: ${colorLabel}. Open to pick a highlight color.`}
        title="Tap to highlight this passage. Pick the same color again to remove the highlight."
        className={triggerButtonInteractiveClass}
        onClick={() => !disabled && setDropdownForReference(open ? null : reference)}
      >
        <HighlightMarkerIcon
          markerColorId={currentColorId}
          variant={currentColorId ? 'filled' : 'outline'}
          className="h-5 w-5 shrink-0"
        />
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
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Highlight color"
          className="absolute left-0 top-full z-110 mt-1 flex min-w-13 flex-col gap-0.5 rounded-md border-2 border-slate-400 dark:border-slate-500 bg-slate-50 p-1 shadow-lg dark:bg-slate-700"
        >
          {SCRIPTURE_HIGHLIGHT_COLOR_IDS.map((id) => (
            <button
              key={id}
              type="button"
              role="option"
              aria-selected={currentColorId === id}
              aria-label={`${SR_LABEL[id]} highlight`}
              data-highlight-color={id}
              className={`${optionButtonClass} cursor-pointer`}
              onClick={() => choose(id)}
            >
              <HighlightMarkerIcon
                variant="filled"
                markerColorId={id}
                className="h-6 w-6 shrink-0"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
