'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export interface ScripturePassageReaderOptionsPanelProps {
  open: boolean
  onClose: () => void
  showVerseNumbers: boolean
  onShowVerseNumbersChange: (show: boolean) => void
  showWordsOfChrist: boolean
  onShowWordsOfChristChange: (show: boolean) => void
}

function OptionRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <label
      className="flex items-center justify-between gap-4 py-2.5 px-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 cursor-pointer"
    >
      <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{label}</span>
      <input
        type="checkbox"
        className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-500 dark:bg-slate-800"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  )
}

export default function ScripturePassageReaderOptionsPanel({
  open,
  onClose,
  showVerseNumbers,
  onShowVerseNumbersChange,
  showWordsOfChrist,
  onShowWordsOfChristChange,
}: ScripturePassageReaderOptionsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    panelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 dark:bg-black/60"
        aria-label="Close reader options"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Scripture reader display"
        tabIndex={-1}
        className="relative w-full max-w-sm rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-600 p-3 outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 px-3 pt-1 pb-2">
          Reader display
        </p>
        <OptionRow
          label="Verse numbers"
          checked={showVerseNumbers}
          onChange={onShowVerseNumbersChange}
        />
        <OptionRow
          label="Red letter"
          checked={showWordsOfChrist}
          onChange={onShowWordsOfChristChange}
        />
      </div>
    </div>,
    document.body
  )
}
