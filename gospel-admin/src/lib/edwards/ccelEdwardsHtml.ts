/**
 * Parse CCEL ThML *Select Sermons* (Jonathan Edwards) into one profile per `<div1>` sermon.
 * Reuses Spurgeon body/outline/`scripRef` handling; assigns sequential `je01` slugs (no catalog numbers).
 */
import type { GospelSection } from '@/lib/types'
import {
  div1XmlToGospelSubsections,
  extractDiv1Blocks,
  normalizedPassageDisplayForInline,
  passageKeysFromRefs,
  repairSpurgeonSubsectionsMislumpedRomanOne,
} from '@/lib/spurgeon/ccelSermonHtml'
import { slugForEdwardsSermonNumber } from '@/lib/edwards/edwardsSlug'

export const CCEL_EDWARDS_SERMONS_XML_URL =
  'https://www.ccel.org/ccel/edwards/sermons.xml'

const SKIP_DIV1_TITLES = new Set(['title page', 'indexes'])

export type ParsedEdwardsSermonDiv1 = {
  sermonTitle: string
  divInner: string
  sermonNo: number
  slug: string
  gospelSection: GospelSection
  passageKeys: string[]
}

function shouldSkipDiv1Title(title: string): boolean {
  return SKIP_DIV1_TITLES.has(title.trim().toLowerCase())
}

export function parseCcelEdwardsSermons(
  xml: string,
  options?: { limit?: number; slug?: string }
): ParsedEdwardsSermonDiv1[] {
  const limit = options?.limit ?? 99
  const targetSlug = options?.slug?.trim().toLowerCase() ?? null
  const sermons: ParsedEdwardsSermonDiv1[] = []
  const blocks = extractDiv1Blocks(xml)
  let sermonNo = 0

  for (const block of blocks) {
    const titleMatch = block.match(/<div1\b[^>]*\btitle="([^"]*)"/i)
    const sermonTitle = titleMatch?.[1]?.trim() || 'Untitled'
    if (shouldSkipDiv1Title(sermonTitle)) continue

    const innerMatch = block.match(/<div1\b[^>]*>([\s\S]*)<\/div1>\s*$/i)
    const divInner = innerMatch
      ? innerMatch[1]
      : block.replace(/^<div1\b[^>]*>/i, '').replace(/<\/div1>\s*$/i, '')

    const { subsections: parsedSubsections, allPassages } = div1XmlToGospelSubsections(divInner)
    if (parsedSubsections.length === 0) continue

    const repaired = repairSpurgeonSubsectionsMislumpedRomanOne(parsedSubsections)
    const subsections = repaired.subsections

    sermonNo += 1
    const slug = slugForEdwardsSermonNumber(sermonNo)
    if (targetSlug && slug !== targetSlug) continue

    const passageKeys = passageKeysFromRefs(
      allPassages.map((raw) => normalizedPassageDisplayForInline(raw))
    )

    const gospelSection: GospelSection = {
      section: slug,
      title: sermonTitle,
      subsections,
    }

    sermons.push({
      sermonTitle,
      divInner,
      sermonNo,
      slug,
      gospelSection,
      passageKeys,
    })

    if (!targetSlug && sermons.length >= limit) break
  }

  return sermons
}
