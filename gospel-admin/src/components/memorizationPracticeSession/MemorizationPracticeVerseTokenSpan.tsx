import type { MemorizationToken } from '@/lib/memorizationPracticeUtils'

export type MemorizationPracticeVerseTokenSpanProps = {
  token: MemorizationToken
  index: number
  hiddenIndices: Set<number>
  revealed: Set<number>
  hintActive: boolean
  hintPeekIndices: Set<number>
  currentTargetIndex: number | null
}

export function MemorizationPracticeVerseTokenSpan({
  token,
  index,
  hiddenIndices,
  revealed,
  hintActive,
  hintPeekIndices,
  currentTargetIndex,
}: MemorizationPracticeVerseTokenSpanProps) {
  if (token.kind === 'punct') {
    return (
      <span key={`tok-${index}`} className="inline text-slate-900 dark:text-slate-100 whitespace-pre">
        {token.text}
      </span>
    )
  }
  const w = token.text
  const isHidden = hiddenIndices.has(index)
  const isRevealed = revealed.has(index)
  const showViaHint = hintActive && isHidden && !isRevealed && hintPeekIndices.has(index)
  const showBlankUnderline = isHidden && !isRevealed
  const isCurrent = showBlankUnderline && index === currentTargetIndex

  let innerClass = 'text-slate-900 dark:text-slate-100'
  if (showBlankUnderline) {
    innerClass = showViaHint
      ? 'text-blue-800 dark:text-blue-200 italic'
      : 'text-transparent select-none pointer-events-none'
  }

  return (
    <span
      key={`tok-${index}`}
      data-memorize-current-blank={isCurrent ? 'true' : undefined}
      className={`inline-flex items-baseline border-b-2 box-border px-1 sm:px-0.5 min-h-[1.5em] min-w-[0.6em] justify-center ${
        showBlankUnderline
          ? 'border-slate-400 dark:border-slate-500'
          : 'border-transparent'
      } ${isCurrent ? 'bg-blue-100/80 dark:bg-blue-900/40' : ''}`}
      aria-current={isCurrent ? 'true' : undefined}
    >
      <span className={innerClass} aria-hidden={showBlankUnderline && !showViaHint}>
        {w}
      </span>
    </span>
  )
}
