import type { GospelSection } from '@/lib/types'

/**
 * First gospel subsection/nested block that lists this reference as a scripture *card* (pill list).
 * Inline references in body text are not included — returns null if the ref only appears in prose.
 */
export function findFirstScriptureCardAnchors(
  sectionList: GospelSection[],
  reference: string
): { sectionId: string; subsectionId: string } | null {
  outer: for (const section of sectionList) {
    const sid = `section-${section.section}`
    for (let subIndex = 0; subIndex < section.subsections.length; subIndex++) {
      const subsection = section.subsections[subIndex]
      if (subsection.scriptureReferences?.some(r => r.reference === reference)) {
        return { sectionId: sid, subsectionId: `${sid}-${subIndex}` }
      }
      if (subsection.nestedSubsections) {
        for (let n = 0; n < subsection.nestedSubsections.length; n++) {
          const nested = subsection.nestedSubsections[n]
          if (nested.scriptureReferences?.some(r => r.reference === reference)) {
            return { sectionId: sid, subsectionId: `${sid}-${subIndex}-${n}` }
          }
        }
      }
    }
  }
  return null
}
