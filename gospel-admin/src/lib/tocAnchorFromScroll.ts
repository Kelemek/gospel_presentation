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

const orderedTocAnchorIdsCache = new WeakMap<GospelSection[], string[]>()

/** Cached TOC anchor ids (document order) for scrollspy and reading-position capture. */
export function getOrderedTocAnchorIds(sections: GospelSection[]): string[] {
  let cached = orderedTocAnchorIdsCache.get(sections)
  if (!cached) {
    cached = buildOrderedTocAnchorIds(sections)
    orderedTocAnchorIdsCache.set(sections, cached)
  }
  return cached
}

/** First TOC anchor id in document order (matches `buildOrderedTocAnchorIds(sections)[0]` when rendered). */
export function getFirstTocAnchorIdInDocument(): string | null {
  if (typeof document === 'undefined') return null
  const el = document.querySelector('[id^="section-"]')
  if (!(el instanceof HTMLElement) || !el.id) return null
  return el.id
}

function tocAnchorViewportTop(id: string): number | null {
  const el = document.getElementById(id)
  if (!el || typeof el.getBoundingClientRect !== 'function') return null
  return el.getBoundingClientRect().top
}

function findCurrentTocAnchorIndexLinear(orderedIds: string[], threshold: number): number {
  let activeIndex = -1
  for (let i = 0; i < orderedIds.length; i += 1) {
    const top = tocAnchorViewportTop(orderedIds[i]!)
    if (top === null) continue
    if (activeIndex < 0) activeIndex = i
    if (top <= threshold) activeIndex = i
  }
  return activeIndex
}

/** O(log n) scrollspy when anchor tops increase with document order (typical profile layout). */
function findCurrentTocAnchorIndexByBinarySearch(orderedIds: string[], threshold: number): number {
  let lo = 0
  let hi = orderedIds.length - 1
  let best = -1

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    const top = tocAnchorViewportTop(orderedIds[mid]!)
    if (top === null) return -1
    if (top <= threshold) {
      best = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }

  return best
}

/**
 * Best-guess TOC anchor for current scroll position (scrollspy-style).
 */
export function getCurrentTocAnchorId(sections: GospelSection[]): string | null {
  if (typeof window === 'undefined' || sections.length === 0) return null
  const orderedIds = getOrderedTocAnchorIds(sections)
  const threshold = getProfileHeaderScrollOffset() + 24

  let index = findCurrentTocAnchorIndexByBinarySearch(orderedIds, threshold)
  if (index < 0) {
    index = findCurrentTocAnchorIndexLinear(orderedIds, threshold)
  }
  if (index < 0) return null
  return orderedIds[index] ?? null
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
