import type { GospelSection } from '@/lib/types'
import { stripHtmlTags } from '@/lib/stripHtmlTags'

/** Plain object matching the scripture modal `presentationLocation` prop shape. */
export type ScriptureModalPresentationLocation = {
  sectionTitle: string
  subsectionTitle: string
  nestedSubsectionTitle?: string
}

const SECTION_PREFIX = 'section-'

/**
 * Build modal “where you are” labels from profile `sections` + TOC anchors (no scripture *card* required).
 * Matches `GospelSection` ids: `section-{key}`, subsection `section-{key}-{i}`, nested `section-{key}-{i}-{j}`.
 */
export function presentationLocationFromProfileAnchors(
  sections: GospelSection[] | null | undefined,
  sectionId: string,
  subsectionId: string
): ScriptureModalPresentationLocation | null {
  if (!sections?.length) return null
  const sid = sectionId.trim()
  const subAnchor = subsectionId.trim()
  if (!sid || !subAnchor || !sid.startsWith(SECTION_PREFIX)) return null

  const sectionKey = sid.slice(SECTION_PREFIX.length)
  const section = sections.find((s) => String(s.section) === sectionKey)
  if (!section) return null

  const sectionTitle = stripHtmlTags(section.title ?? '').trim()

  if (subAnchor === sid) {
    return {
      sectionTitle,
      subsectionTitle: '',
    }
  }

  if (!subAnchor.startsWith(`${sid}-`)) return null
  const rest = subAnchor.slice(sid.length + 1)
  const indexParts = rest.split('-')
  const indices: number[] = []
  for (const p of indexParts) {
    const n = parseInt(p, 10)
    if (!Number.isFinite(n) || String(n) !== p) return null
    indices.push(n)
  }
  if (indices.length < 1 || indices.length > 2) return null

  const subIndex = indices[0]!
  const subsection = section.subsections[subIndex]
  if (!subsection) return null

  const parentSubTitle = stripHtmlTags(subsection.title ?? '').trim()

  if (indices.length === 1) {
    return {
      sectionTitle,
      subsectionTitle: parentSubTitle,
    }
  }

  const nestedIndex = indices[1]!
  const nested = subsection.nestedSubsections?.[nestedIndex]
  if (!nested) return null

  const nestedPlain = stripHtmlTags(nested.title ?? '').trim()
  return {
    sectionTitle,
    subsectionTitle: parentSubTitle,
    ...(nestedPlain ? { nestedSubsectionTitle: nestedPlain } : {}),
  }
}
