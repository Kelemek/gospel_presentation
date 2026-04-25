'use client'

import { useId } from 'react'
import {
  MEMORIZE_LISTEN_SPEEDS,
  type MemorizeListenSpeed,
  formatMemorizeListenSpeedLabel,
} from '@/lib/memorizeListenSpeedStorage'

export interface MemorizeListenSpeedButtonProps {
  value: MemorizeListenSpeed
  onSelect: (rate: MemorizeListenSpeed) => void
  /** @deprecated All options are shown in the select; kept for API compatibility. */
  showCurrentOnTrigger?: boolean
}

/**
 * Native read-aloud speed control (preset multipliers). Uses `<select>` so the menu is not
 * clipped by the memorize modal’s `overflow-y-auto` / `overflow-hidden` ancestors.
 * Chevron background is in `globals.css` (`.memorize-listen-speed-select`) to avoid Tailwind
 * v4 misparsing `url(\`data:…\`)` in this file and emitting invalid `url(var(--ch))` CSS in dev.
 */
export function MemorizeListenSpeedButton({
  value,
  onSelect,
}: MemorizeListenSpeedButtonProps) {
  const fieldId = useId()
  const v = String(value)
  return (
    <div className="w-full min-w-0 sm:w-auto">
      <label className="sr-only" htmlFor={fieldId}>
        Read-aloud speed
      </label>
      <select
        id={fieldId}
        data-testid="memorize-listen-speed"
        className="memorize-listen-speed-select box-border w-full min-w-0 sm:w-auto sm:max-w-fit h-12.5 cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white pl-4 pr-14 text-left text-base font-medium text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        value={v}
        onChange={(e) => {
          const n = Number.parseFloat(e.currentTarget.value) as MemorizeListenSpeed
          onSelect(n)
        }}
        aria-label={`Read-aloud speed, currently ${formatMemorizeListenSpeedLabel(
          value
        )}. Choose a different speed.`}
      >
        {MEMORIZE_LISTEN_SPEEDS.map((rate) => (
          <option key={String(rate)} value={String(rate)}>
            {formatMemorizeListenSpeedLabel(rate)}
          </option>
        ))}
      </select>
    </div>
  )
}
