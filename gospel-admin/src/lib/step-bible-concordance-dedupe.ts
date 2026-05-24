import type { StepBibleConcordanceOccurrence } from '@/lib/step-bible-types'

/** One list row per verse — keeps first gloss when the same Strong’s appears multiple times in a passage. */
export function dedupeConcordanceOccurrencesByPassage(
  occurrences: StepBibleConcordanceOccurrence[]
): StepBibleConcordanceOccurrence[] {
  const seen = new Set<string>()
  const out: StepBibleConcordanceOccurrence[] = []
  for (const occ of occurrences) {
    if (seen.has(occ.passageKey)) continue
    seen.add(occ.passageKey)
    out.push(occ)
  }
  return out
}
