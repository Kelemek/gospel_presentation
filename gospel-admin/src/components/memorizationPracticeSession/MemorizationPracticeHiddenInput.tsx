'use client'

import type { FormEvent, KeyboardEvent, Ref } from 'react'
import type { MemorizationToken } from '@/lib/memorizationPracticeUtils'

const PRACTICE_INPUT_ARIA_LABEL =
  'Type the first letter of each blank word, or each digit for number blanks. In Initials mode, dots in the initials row fill in when you type correctly.'

export type MemorizationPracticeHiddenInputProps = {
  variant: 'android' | 'inColumn'
  practiceInputDomId: string
  inputRef: Ref<HTMLInputElement>
  currentTargetToken: MemorizationToken | null
  isRoundComplete: boolean
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void
  onInput: (e: FormEvent<HTMLInputElement>) => void
}

export function MemorizationPracticeHiddenInput({
  variant,
  practiceInputDomId,
  inputRef,
  currentTargetToken,
  isRoundComplete,
  onKeyDown,
  onInput,
}: MemorizationPracticeHiddenInputProps) {
  const inputMode = currentTargetToken?.kind === 'digit' ? 'numeric' : 'text'

  if (variant === 'android') {
    return (
      <input
        id={practiceInputDomId}
        ref={inputRef}
        type="text"
        inputMode={inputMode}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="done"
        disabled={isRoundComplete}
        aria-label={PRACTICE_INPUT_ARIA_LABEL}
        data-testid="memorize-practice-input"
        tabIndex={isRoundComplete ? -1 : 0}
        className="pointer-events-none fixed top-[25vh] left-1/2 z-110 h-10 w-32 max-w-[min(12rem,45vw)] -translate-x-1/2 border-0 bg-transparent p-0 opacity-[0.02] text-transparent caret-transparent"
        onKeyDown={onKeyDown}
        onInput={onInput}
      />
    )
  }

  return (
    <input
      id={practiceInputDomId}
      ref={inputRef}
      type="text"
      inputMode={inputMode}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      enterKeyHint="done"
      disabled={isRoundComplete}
      aria-label={PRACTICE_INPUT_ARIA_LABEL}
      data-testid="memorize-practice-input"
      tabIndex={isRoundComplete ? -1 : 0}
      className="absolute left-0 top-0 z-0 h-px w-full max-w-full border-0 bg-transparent p-0 opacity-[0.02] text-transparent caret-transparent"
      onKeyDown={onKeyDown}
      onInput={onInput}
    />
  )
}
