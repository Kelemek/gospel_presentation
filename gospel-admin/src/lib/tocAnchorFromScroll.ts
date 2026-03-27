import type { GospelSection } from '@/lib/types'
import { stripHtmlTags } from '@/lib/stripHtmlTags'
import { getProfileHeaderScrollOffset } from '@/lib/scrollToTocAnchor'

function isTitleBlank(title: string | undefined): boolean {
  return !stripHtmlTags(title ?? '').trim()
}

/**
 * Anchor ids in the same document order as TableOfContents links (section, subsection, nested).
 */
export function buildOrderedTocAnchorIds(sections: GospelSection[]): string[] {
  const ids: string[] = []
  for (const section of sections) {
    ids.push(`section-${section.section}`)
    section.subsections.forEach((subsection, index) => {
      const nestedSubsections =
        subsection.nestedSubsections?.filter((n) => !isTitleBlank(n.title)) ?? []
      const hasVisibleNested = nestedSubsections.length > 0
      const subsectionTitleBlank = isTitleBlank(subsection.title)
      if (subsectionTitleBlank && !hasVisibleNested) return
      if (!subsectionTitleBlank) {
        ids.push(`section-${section.section}-${index}`)
      }
      if (hasVisibleNested) {
        for (const nested of nestedSubsections) {
          const originalNestedIndex = subsection.nestedSubsections!.indexOf(nested)
          ids.push(`section-${section.section}-${index}-${originalNestedIndex}`)
        }
      }
    })
  }
  return ids
}

/**
 * Best-guess TOC anchor for current scroll position (scrollspy-style).
 */
export function getCurrentTocAnchorId(sections: GospelSection[]): string | null {
  if (typeof window === 'undefined' || sections.length === 0) return null
  const orderedIds = buildOrderedTocAnchorIds(sections)
  const threshold = getProfileHeaderScrollOffset() + 24

  let activeId: string | null = null
  for (const id of orderedIds) {
    const el = document.getElementById(id)
    if (!el) continue
    if (activeId === null) activeId = id
    if (el.getBoundingClientRect().top <= threshold) {
      activeId = id
    }
  }
  return activeId
}

/**
 * Human-readable location line for a TOC anchor (e.g. "Section / Subsection").
 */
export function getLocationLabel(sections: GospelSection[], anchorId: string): string {
  const match = anchorId.match(/^section-([^-]+)(?:-(\d+)(?:-(\d+))?)?$/)
  if (!match) return anchorId

  const sectionKey = match[1]
  const subIndex = match[2] !== undefined ? parseInt(match[2], 10) : null
  const nestedIndex = match[3] !== undefined ? parseInt(match[3], 10) : null

  const section = sections.find((s) => String(s.section) === sectionKey)
  if (!section) return anchorId

  const sectionTitle = stripHtmlTags(section.title).trim()
  if (subIndex === null) return sectionTitle || anchorId

  const subsection = section.subsections[subIndex]
  if (!subsection) return sectionTitle || anchorId

  const subTitle = stripHtmlTags(subsection.title).trim()
  if (nestedIndex === null) {
    return subTitle ? `${sectionTitle} / ${subTitle}` : sectionTitle
  }

  const nested = subsection.nestedSubsections?.[nestedIndex]
  if (!nested) {
    return subTitle ? `${sectionTitle} / ${subTitle}` : sectionTitle
  }
  const nestedTitle = stripHtmlTags(nested.title).trim()
  if (nestedTitle && subTitle) {
    return `${sectionTitle} / ${subTitle} / ${nestedTitle}`
  }
  if (nestedTitle) return `${sectionTitle} / ${nestedTitle}`
  if (subTitle) return `${sectionTitle} / ${subTitle}`
  return sectionTitle
}
