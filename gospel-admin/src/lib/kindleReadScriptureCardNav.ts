import type { BibleTranslation } from '@/lib/bible-translations'
import {
  kindleReadNestedId,
  kindleReadSectionId,
  kindleReadSubsectionId,
  kindleScriptureReadUrl,
  shouldRenderKindleReadScriptureCards,
} from '@/lib/kindleReadHtml'
import {
  indexOfScriptureCardInList,
  type ScriptureCardAnchor,
  type ScriptureCardAnchorLookup,
} from '@/lib/scriptureModalOpenMode'
import type { GospelPresentationData } from '@/lib/types'
import type { KindleReadScriptureChapterNav } from '@/lib/kindleReadScripture'

export type KindleScriptureCardNavEntry = ScriptureCardAnchor & {
  kindleAnchor: string
}

/** Section id (e.g. `section-bxrp`) from a subsection or nested anchor id. */
export function kindleReadSectionIdFromSubsectionOrNestedId(
  subsectionOrNestedId: string
): string {
  const parts = subsectionOrNestedId.trim().split('-')
  if (parts[0] !== 'section' || parts.length < 3) {
    return subsectionOrNestedId.trim()
  }
  return `${parts[0]}-${parts[1]}`
}

/** Map Kindle read anchor param to profile section/subsection ids for card lookup. */
export function kindleReadScriptureAnchorLookup(
  anchor: string | null | undefined
): ScriptureCardAnchorLookup | undefined {
  const trimmed = anchor?.trim()
  if (!trimmed) return undefined
  const subsectionOrNestedId = trimmed
    .replace(/-card-\d+$/, '')
    .replace(/-b-\d+$/, '')
    .replace(/-q-\d+$/, '')
  if (!subsectionOrNestedId.startsWith('section-')) return undefined
  return {
    sectionId: kindleReadSectionIdFromSubsectionOrNestedId(subsectionOrNestedId),
    subsectionId: subsectionOrNestedId,
  }
}

/** Gospel card reference for a Kindle scripture anchor id (matches profile read link text). */
export function kindleReadCardReferenceForAnchor(
  sections: GospelPresentationData,
  anchor: string | null | undefined
): string | null {
  const anchorTrim = anchor?.trim()
  if (!anchorTrim) return null
  const entry = collectKindleReadScriptureCardNavEntries(sections).find(
    (card) => card.kindleAnchor === anchorTrim
  )
  return entry?.reference ?? null
}

/** Scripture cards in profile order (same sequence as the main site modal), Kindle-visible only. */
export function collectKindleReadScriptureCardNavEntries(
  sections: GospelPresentationData
): KindleScriptureCardNavEntry[] {
  return (sections ?? []).flatMap((section) => {
    const sectionId = kindleReadSectionId(section.section)
    return (section.subsections ?? []).flatMap((subsection, subsectionIndex) => {
      const subsectionId = kindleReadSubsectionId(section.section, subsectionIndex)
      const mainEntries = shouldRenderKindleReadScriptureCards(
        subsection.scriptureReferences,
        subsection.content
      )
        ? (subsection.scriptureReferences ?? []).map((ref, cardIndex) => ({
            reference: ref.reference,
            sectionId,
            subsectionId,
            kindleAnchor: `${subsectionId}-card-${cardIndex}`,
          }))
        : []

      const nestedEntries = (subsection.nestedSubsections ?? []).flatMap((nested, nestedIndex) => {
        const nestedId = kindleReadNestedId(section.section, subsectionIndex, nestedIndex)
        if (!shouldRenderKindleReadScriptureCards(nested.scriptureReferences, nested.content)) {
          return []
        }
        return (nested.scriptureReferences ?? []).map((ref, cardIndex) => ({
          reference: ref.reference,
          sectionId,
          subsectionId: nestedId,
          kindleAnchor: `${nestedId}-card-${cardIndex}`,
        }))
      })

      return [...mainEntries, ...nestedEntries]
    })
  })
}

function kindleReadScriptureFromSlug(fromSlug: string | null | undefined): string {
  return fromSlug?.trim() || 'default'
}

/** Prev/next links stepping through scripture cards on the source profile (not canon chapters). */
export function kindleReadScriptureCardNav(
  sections: GospelPresentationData,
  reference: string,
  fromSlug: string | null | undefined,
  anchor?: string | null,
  translation: BibleTranslation = 'esv'
): KindleReadScriptureChapterNav {
  const cards = collectKindleReadScriptureCardNavEntries(sections)
  if (cards.length === 0) {
    return { prev: null, next: null }
  }

  const from = kindleReadScriptureFromSlug(fromSlug)
  const lookup = kindleReadScriptureAnchorLookup(anchor)
  const index = indexOfScriptureCardInList(reference, cards, lookup)
  if (index < 0) {
    return { prev: null, next: null }
  }

  const prevEntry = index > 0 ? cards[index - 1]! : null
  const nextEntry = index < cards.length - 1 ? cards[index + 1]! : null

  return {
    prev: prevEntry
      ? {
          href: kindleScriptureReadUrl(prevEntry.reference, from, prevEntry.kindleAnchor, translation),
          label: `Previous (${prevEntry.reference})`,
        }
      : null,
    next: nextEntry
      ? {
          href: kindleScriptureReadUrl(nextEntry.reference, from, nextEntry.kindleAnchor, translation),
          label: `Next (${nextEntry.reference})`,
        }
      : null,
  }
}
