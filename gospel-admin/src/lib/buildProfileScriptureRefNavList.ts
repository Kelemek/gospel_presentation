import type { GospelSection } from '@/lib/types'
import { stripHtmlTags } from '@/lib/stripHtmlTags'
import type { ScriptureRefNav } from '@/lib/profileContentDomHelpers'

/** All scripture *cards* in profile order, with DOM anchors (duplicate references = separate entries). */
export function buildProfileScriptureRefNavList(sections: GospelSection[] | undefined): ScriptureRefNav[] {
  if (!sections) return []
  return sections.flatMap((section) => {
    const sid = `section-${section.section}`
    return section.subsections.flatMap((subsection, subIndex) => {
      const subId = `${sid}-${subIndex}`
      const sectionTitle = stripHtmlTags(section.title ?? '').trim()
      const parentSubTitle = stripHtmlTags(subsection.title ?? '').trim()
      const main: ScriptureRefNav[] = (subsection.scriptureReferences || []).map((ref) => ({
        reference: ref.reference,
        sectionId: sid,
        subsectionId: subId,
        sectionTitle,
        subsectionTitle: parentSubTitle,
      }))
      const nested: ScriptureRefNav[] = (subsection.nestedSubsections || []).flatMap((nested, n) => {
        const nestedId = `${sid}-${subIndex}-${n}`
        const nestedTitle = stripHtmlTags(nested.title ?? '').trim()
        return (nested.scriptureReferences || []).map((ref) => ({
          reference: ref.reference,
          sectionId: sid,
          subsectionId: nestedId,
          sectionTitle,
          subsectionTitle: parentSubTitle,
          nestedSubsectionTitle: nestedTitle,
        }))
      })
      return [...main, ...nested]
    })
  })
}
