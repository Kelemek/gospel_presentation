'use client'

import type { RefObject } from 'react'
import type { MemorizationToken } from '@/lib/memorizationPracticeUtils'
import { MemorizationPracticeVerseTokenSpan } from '@/components/memorizationPracticeSession/MemorizationPracticeVerseTokenSpan'

export type MemorizationPracticeTypeRoundPanelProps = {
  tokens: MemorizationToken[]
  hiddenIndices: Set<number>
  revealed: Set<number>
  hintActive: boolean
  hintPeekIndices: Set<number>
  currentTargetIndex: number | null
  currentTargetToken: MemorizationToken | null
  flashError: boolean
  practiceInputDomId: string
  practiceWordsTypeRef: RefObject<HTMLLabelElement | null>
  practiceInputRef: RefObject<HTMLInputElement | null>
  verseTouchMovedRef: RefObject<boolean>
  verseTouchStartRef: RefObject<{ x: number; y: number }>
  isRoundComplete: boolean
}

export function MemorizationPracticeTypeRoundPanel({
  tokens,
  hiddenIndices,
  revealed,
  hintActive,
  hintPeekIndices,
  currentTargetIndex,
  currentTargetToken,
  flashError,
  practiceInputDomId,
  practiceWordsTypeRef,
  practiceInputRef,
  verseTouchMovedRef,
  verseTouchStartRef,
  isRoundComplete,
}: MemorizationPracticeTypeRoundPanelProps) {
  return (
    <>
      {currentTargetIndex !== null && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          {currentTargetToken?.kind === 'digit'
            ? 'Type the next digit (left to right). Colons and dashes in the reference are not typed.'
            : 'Type the first letter of the next blank (left to right). Hold Hint to peek; another blank appears every second while you hold.'}
          {' '}
          Tap the verse or blanks if the keyboard closed.
        </p>
      )}
      <label
      ref={practiceWordsTypeRef}
      htmlFor={practiceInputDomId}
      aria-label="Verse practice area; tap to show the keyboard again"
      onTouchStart={(e) => {
        verseTouchMovedRef.current = false
        const t = e.touches[0]
        if (t) verseTouchStartRef.current = { x: t.clientX, y: t.clientY }
      }}
      onTouchMove={(e) => {
        const t = e.touches[0]
        if (!t) return
        const dx = t.clientX - verseTouchStartRef.current.x
        const dy = t.clientY - verseTouchStartRef.current.y
        if (dx * dx + dy * dy > 144) verseTouchMovedRef.current = true
      }}
      onTouchCancel={() => {
        verseTouchMovedRef.current = false
      }}
      onTouchEnd={() => {
        if (isRoundComplete) return
        const wasScroll = verseTouchMovedRef.current
        verseTouchMovedRef.current = false
        if (wasScroll) return
        const input = practiceInputRef.current
        if (!input) return
        input.focus({ preventScroll: true })
        window.setTimeout(() => {
          if (document.activeElement !== input) input.focus({ preventScroll: true })
        }, 0)
      }}
      className={`touch-manipulation cursor-text text-base leading-relaxed font-serif flex flex-wrap gap-x-2 gap-y-2.5 sm:gap-x-1 sm:gap-y-2 items-baseline rounded-md p-1 ring-2 ring-inset transition-shadow ${
        flashError ? 'ring-red-400 dark:ring-red-500' : 'ring-transparent'
      }`}
      data-testid="memorize-practice-words"
    >
      {tokens.map((token, i) => (
        <MemorizationPracticeVerseTokenSpan
          key={`tok-${i}`}
          token={token}
          index={i}
          hiddenIndices={hiddenIndices}
          revealed={revealed}
          hintActive={hintActive}
          hintPeekIndices={hintPeekIndices}
          currentTargetIndex={currentTargetIndex}
        />
      ))}
      </label>
    </>
  )
}
