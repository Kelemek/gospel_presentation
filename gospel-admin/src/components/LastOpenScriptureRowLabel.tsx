'use client'

import type { BibleTranslation } from '@/lib/bible-translations'
import {
  lastOpenScriptureDisplayParts,
  lastOpenScriptureMenuTitle,
  lastOpenScriptureTranslationCode,
} from '@/lib/lastOpenScriptureLabel'

export type LastOpenScriptureRowLabelProps = {
  reference: string
  translation?: BibleTranslation
}

/** Last Open scripture row: truncated book, visible chapter:verse, then translation code. */
export default function LastOpenScriptureRowLabel({
  reference,
  translation,
}: LastOpenScriptureRowLabelProps) {
  const { book, referenceSuffix } = lastOpenScriptureDisplayParts(reference)
  const code = lastOpenScriptureTranslationCode(translation)
  const title = lastOpenScriptureMenuTitle(reference, translation)

  if (!referenceSuffix && !code) {
    return (
      <span className="min-w-0 flex-1 truncate" title={title}>
        {book}
      </span>
    )
  }

  return (
    <span className="min-w-0 flex-1 flex items-baseline gap-x-1 overflow-hidden" title={title}>
      <span className="min-w-0 truncate">{book}</span>
      {referenceSuffix ? (
        <span className="shrink-0 whitespace-nowrap">{referenceSuffix}</span>
      ) : null}
      {code ? (
        <span className="shrink-0 whitespace-nowrap text-slate-500 dark:text-slate-400">
          {' · '}
          {code}
        </span>
      ) : null}
    </span>
  )
}
