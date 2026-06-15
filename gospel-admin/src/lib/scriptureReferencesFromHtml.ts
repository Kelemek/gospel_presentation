import { segmentPlainTextForGospelInlines } from '@/lib/injectGospelInlineMarkersInHtml'
import {
  isGospelCanonicalScriptureRef,
  normalizeScriptureReferenceString,
  scriptureDisplaysToCardRefs,
} from '@/lib/scriptureReferenceNormalize'
import { passageDisplaysFromFragment } from '@/lib/spurgeon/ccelSermonHtml'
import { gospelHtmlToPlainForScriptureScan } from '@/lib/spurgeon/passageKeysFromGospelData'
import type { ScriptureReference } from '@/lib/types'

function pushPlainTextRefs(plain: string, out: string[]): void {
  if (!plain) return
  for (const seg of segmentPlainTextForGospelInlines(plain)) {
    if (seg.kind === 'scripture') out.push(seg.cleanRef)
  }
}

function orderedUniqueCanonicalRefs(displays: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of displays) {
    for (const trimmed of scriptureDisplaysToCardRefs(raw)) {
      if (!trimmed) continue
      const norm = normalizeScriptureReferenceString(trimmed)
      if (!norm || !isGospelCanonicalScriptureRef(norm) || seen.has(norm)) continue
      seen.add(norm)
      out.push(norm)
    }
  }
  return out
}

/**
 * Build deduplicated scripture cards for a subsection from ThML source, stored HTML, and title.
 * Order follows first appearance (ThML tags, then title scan, then body scan).
 */
export function collectScriptureReferencesForSubsection(args: {
  thmlInner?: string
  contentHtml: string
  title?: string
}): ScriptureReference[] {
  const displays: string[] = []
  const thml = args.thmlInner?.trim()
  if (thml) displays.push(...passageDisplaysFromFragment(thml))
  const titlePlain = gospelHtmlToPlainForScriptureScan(args.title ?? '')
  pushPlainTextRefs(titlePlain, displays)
  const bodyPlain = gospelHtmlToPlainForScriptureScan(args.contentHtml)
  pushPlainTextRefs(bodyPlain, displays)

  return orderedUniqueCanonicalRefs(displays).map((reference) => ({
    reference,
    favorite: false,
  }))
}
