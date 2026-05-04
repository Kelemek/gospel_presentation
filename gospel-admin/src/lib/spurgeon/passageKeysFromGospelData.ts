import type { GospelPresentationData, NestedSubsection, Subsection } from '@/lib/types'
import { segmentPlainTextForGospelInlines } from '@/lib/injectGospelInlineMarkersInHtml'
import { passageKeysFromRefs, unwrapScripRefTags } from '@/lib/spurgeon/ccelSermonHtml'

/** Strip tags / ThML wrappers so {@link segmentPlainTextForGospelInlines} can find scripture. */
export function gospelHtmlToPlainForScriptureScan(html: string): string {
  if (!html?.trim()) return ''
  return unwrapScripRefTags(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*:\s*/g, ':')
    .trim()
}

function pushRefsFromPlainText(plain: string, out: string[]): void {
  if (!plain) return
  for (const seg of segmentPlainTextForGospelInlines(plain)) {
    if (seg.kind === 'scripture') out.push(seg.cleanRef)
  }
}

function walkNested(n: NestedSubsection, out: string[]): void {
  pushRefsFromPlainText(gospelHtmlToPlainForScriptureScan(n.title), out)
  pushRefsFromPlainText(gospelHtmlToPlainForScriptureScan(n.content), out)
  for (const sr of n.scriptureReferences || []) {
    const r = sr.reference?.trim()
    if (r) out.push(r)
  }
  for (const q of n.questions || []) {
    if (q.question?.trim()) pushRefsFromPlainText(gospelHtmlToPlainForScriptureScan(q.question), out)
    if (q.answer?.trim()) pushRefsFromPlainText(gospelHtmlToPlainForScriptureScan(q.answer), out)
  }
}

function walkSubsection(sub: Subsection, out: string[]): void {
  pushRefsFromPlainText(gospelHtmlToPlainForScriptureScan(sub.title), out)
  pushRefsFromPlainText(gospelHtmlToPlainForScriptureScan(sub.content), out)
  for (const sr of sub.scriptureReferences || []) {
    const r = sr.reference?.trim()
    if (r) out.push(r)
  }
  for (const q of sub.questions || []) {
    if (q.question?.trim()) pushRefsFromPlainText(gospelHtmlToPlainForScriptureScan(q.question), out)
    if (q.answer?.trim()) pushRefsFromPlainText(gospelHtmlToPlainForScriptureScan(q.answer), out)
  }
  for (const n of sub.nestedSubsections || []) {
    walkNested(n, out)
  }
}

/**
 * Collect human-readable scripture strings from stored profile gospel JSON
 * (titles, HTML bodies, scripture cards, reflection Q/A).
 */
export function collectReferenceStringsFromGospelData(sections: GospelPresentationData): string[] {
  const out: string[] = []
  for (const sec of sections || []) {
    pushRefsFromPlainText(gospelHtmlToPlainForScriptureScan(sec.title), out)
    for (const sub of sec.subsections || []) {
      walkSubsection(sub, out)
    }
  }
  return out
}

/** Canonical passage index keys (with range→verse expansion) for a sermon profile payload. */
export function passageKeysFromGospelPresentationData(sections: GospelPresentationData): string[] {
  const raw = collectReferenceStringsFromGospelData(sections)
  const unique = [...new Set(raw.map((r) => r.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  return passageKeysFromRefs(unique)
}

/** Parse sermon catalog number from slug {@code sg00042} → {@code 42}. */
export function sermonNumberFromSgSlug(slug: string): number | null {
  const m = /^sg(\d{5})$/i.exec(slug.trim())
  if (!m) return null
  const n = parseInt(m[1], 10)
  return Number.isFinite(n) ? n : null
}
