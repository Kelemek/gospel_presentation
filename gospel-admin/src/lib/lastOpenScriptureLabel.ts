import type { BibleTranslation } from '@/lib/bible-translations'
import { splitScriptureReferenceForHeader } from '@/lib/splitScriptureReferenceForHeader'

/** Full label for tooltips and accessible names (e.g. `Galatians 2:16 · ESV`). */
export function lastOpenScriptureMenuTitle(
  reference: string,
  translation?: BibleTranslation
): string {
  const ref = reference.trim()
  if (!ref) return ''
  const code = translation?.toUpperCase()
  return code ? `${ref} · ${code}` : ref
}

export function lastOpenScriptureTranslationCode(
  translation?: BibleTranslation
): string | null {
  return translation ? translation.toUpperCase() : null
}

/** Book vs chapter:verse parts for Last Open rows (book truncates in the UI). */
export function lastOpenScriptureDisplayParts(reference: string): {
  book: string
  referenceSuffix: string
} {
  return splitScriptureReferenceForHeader(reference)
}
