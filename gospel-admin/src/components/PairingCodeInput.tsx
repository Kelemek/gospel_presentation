'use client'

import { useCallback, useEffect, useRef } from 'react'

export interface PairingCodeInputProps {
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  disabled?: boolean
  /** Suppress iOS Safari scrollIntoView when the keyboard opens (avoids modal scroll thrash). */
  suppressIosScrollIntoView?: boolean
}

export function normalizePairingCodeInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 6)
}

export default function PairingCodeInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  suppressIosScrollIntoView = true,
}: PairingCodeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  /** Skip duplicate apply when iOS fires both input and change for one autofill. */
  const lastAppliedRef = useRef<string | null>(null)

  useEffect(() => {
    lastAppliedRef.current = value
  }, [value])

  useEffect(() => {
    if (!suppressIosScrollIntoView) return undefined
    const input = inputRef.current
    if (!input) return undefined
    const previous = input.scrollIntoView
    input.scrollIntoView = () => {}
    return () => {
      input.scrollIntoView = previous
    }
  }, [suppressIosScrollIntoView])

  const applyValue = useCallback(
    (raw: string) => {
      const next = normalizePairingCodeInput(raw)
      if (next === lastAppliedRef.current) return
      lastAppliedRef.current = next
      onChange(next)
      if (next.length === 6) {
        onComplete?.(next)
      }
    },
    [onChange, onComplete]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      applyValue(e.target.value)
    },
    [applyValue]
  )

  const handleInput = useCallback(
    (e: React.FormEvent<HTMLInputElement>) => {
      applyValue(e.currentTarget.value)
    },
    [applyValue]
  )

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault()
      applyValue(e.clipboardData.getData('text'))
    },
    [applyValue]
  )

  return (
    <input
      ref={inputRef}
      type="text"
      name="one-time-code"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="one-time-code"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      enterKeyHint="go"
      maxLength={6}
      value={value}
      onChange={handleChange}
      onInput={handleInput}
      onPaste={handlePaste}
      disabled={disabled}
      // Fixed height + matching line-height keeps digits/caret vertically centered on iOS Safari.
      className="appearance-none box-border h-14 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-0 text-center text-2xl font-semibold leading-14 tracking-[0.3em] tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none disabled:opacity-60"
      aria-label="6-digit pairing code"
    />
  )
}
