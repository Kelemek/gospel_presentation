import { canonicalScriptureCacheReference } from '@/lib/api-bible-passage-id'
import type { GospelSection, NestedSubsection, Subsection } from '@/lib/types'
import {
  gospelHtmlToPlainForScriptureScan,
} from '@/lib/spurgeon/passageKeysFromGospelData'
import { segmentPlainTextForGospelInlines } from '@/lib/injectGospelInlineMarkersInHtml'
import { spurgeonPassageKeySpansOverlap } from '@/lib/spurgeon/spurgeonPassageKeyMatch'
import { commentarySubsectionTitleMatchesChapter } from '@/lib/studyCommentaryChapterTitleMatch'

export type StudyPassageAnchor = { sectionId: string; subsectionId: string }

function referenceOverlapsLookup(candidateRef: string, lookupRef: string): boolean {
  const lookupKey = canonicalScriptureCacheReference(lookupRef).trim()
  if (!lookupKey) return false
  const candidateKey = canonicalScriptureCacheReference(candidateRef).trim()
  if (!candidateKey) return false
  return spurgeonPassageKeySpansOverlap(lookupKey, candidateKey)
}

function refsFromPlainText(plain: string): string[] {
  const out: string[] = []
  if (!plain) return out
  for (const seg of segmentPlainTextForGospelInlines(plain)) {
    if (seg.kind === 'scripture') out.push(seg.cleanRef)
  }
  return out
}

function collectReferenceStringsFromNested(n: NestedSubsection): string[] {
  const out: string[] = []
  out.push(...refsFromPlainText(gospelHtmlToPlainForScriptureScan(n.title)))
  out.push(...refsFromPlainText(gospelHtmlToPlainForScriptureScan(n.content)))
  for (const sr of n.scriptureReferences || []) {
    const r = sr.reference?.trim()
    if (r) out.push(r)
  }
  for (const q of n.questions || []) {
    if (q.question?.trim()) {
      out.push(...refsFromPlainText(gospelHtmlToPlainForScriptureScan(q.question)))
    }
    if (q.answer?.trim()) {
      out.push(...refsFromPlainText(gospelHtmlToPlainForScriptureScan(q.answer)))
    }
  }
  return out
}

function collectReferenceStringsFromSubsectionDirect(sub: Subsection): string[] {
  const out: string[] = []
  out.push(...refsFromPlainText(gospelHtmlToPlainForScriptureScan(sub.title)))
  out.push(...refsFromPlainText(gospelHtmlToPlainForScriptureScan(sub.content)))
  for (const sr of sub.scriptureReferences || []) {
    const r = sr.reference?.trim()
    if (r) out.push(r)
  }
  for (const q of sub.questions || []) {
    if (q.question?.trim()) {
      out.push(...refsFromPlainText(gospelHtmlToPlainForScriptureScan(q.question)))
    }
    if (q.answer?.trim()) {
      out.push(...refsFromPlainText(gospelHtmlToPlainForScriptureScan(q.answer)))
    }
  }
  return out
}

function subsectionTitleOrCardMatches(sub: Subsection, lookupRef: string): boolean {
  for (const sr of sub.scriptureReferences || []) {
    const r = sr.reference?.trim()
    if (r && referenceOverlapsLookup(r, lookupRef)) return true
  }
  const title = sub.title?.trim()
  if (title) {
    if (referenceOverlapsLookup(title, lookupRef)) return true
    if (commentarySubsectionTitleMatchesChapter(title, lookupRef)) return true
  }
  return false
}

function subsectionBodyMatches(sub: Subsection, lookupRef: string): boolean {
  for (const ref of collectReferenceStringsFromSubsectionDirect(sub)) {
    if (referenceOverlapsLookup(ref, lookupRef)) return true
  }
  return false
}

function nestedTitleOrCardMatches(nested: NestedSubsection, lookupRef: string): boolean {
  for (const sr of nested.scriptureReferences || []) {
    const r = sr.reference?.trim()
    if (r && referenceOverlapsLookup(r, lookupRef)) return true
  }
  const title = nested.title?.trim()
  if (title) {
    if (referenceOverlapsLookup(title, lookupRef)) return true
    if (commentarySubsectionTitleMatchesChapter(title, lookupRef)) return true
  }
  return false
}

function nestedBodyMatches(nested: NestedSubsection, lookupRef: string): boolean {
  for (const ref of collectReferenceStringsFromNested(nested)) {
    if (referenceOverlapsLookup(ref, lookupRef)) return true
  }
  return false
}

function walkForAnchor(
  sectionList: GospelSection[],
  lookupRef: string,
  matchSubsection: (sub: Subsection) => boolean,
  matchNested: (nested: NestedSubsection) => boolean
): StudyPassageAnchor | null {
  for (const section of sectionList) {
    const sid = `section-${section.section}`
    for (let subIndex = 0; subIndex < section.subsections.length; subIndex++) {
      const subsection = section.subsections[subIndex]
      const subsectionId = `${sid}-${subIndex}`

      if (matchSubsection(subsection)) {
        return { sectionId: sid, subsectionId }
      }

      if (subsection.nestedSubsections) {
        for (let n = 0; n < subsection.nestedSubsections.length; n++) {
          const nested = subsection.nestedSubsections[n]
          if (matchNested(nested)) {
            return { sectionId: sid, subsectionId: `${subsectionId}-${n}` }
          }
        }
      }
    }
  }
  return null
}

/**
 * First profile subsection (document order) whose scripture cards, title, or body
 * overlaps the lookup reference (same rules as passage index / Study by-reference).
 */
export function findFirstStudyPassageAnchor(
  sectionList: GospelSection[],
  reference: string
): StudyPassageAnchor | null {
  const lookupRef = reference.trim()
  if (!lookupRef) return null

  // Prefer titles/cards (Calvin unit headings) before inline footnotes in earlier subsections.
  const fromTitleOrCard = walkForAnchor(
    sectionList,
    lookupRef,
    (sub) => subsectionTitleOrCardMatches(sub, lookupRef),
    (nested) => nestedTitleOrCardMatches(nested, lookupRef)
  )
  if (fromTitleOrCard) return fromTitleOrCard

  return walkForAnchor(
    sectionList,
    lookupRef,
    (sub) => subsectionBodyMatches(sub, lookupRef),
    (nested) => nestedBodyMatches(nested, lookupRef)
  )
}
