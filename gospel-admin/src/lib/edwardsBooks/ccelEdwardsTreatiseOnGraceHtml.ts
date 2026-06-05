/**
 * Parse CCEL ThML `edwards/treatiseongrace.xml` into one gospel profile (3 chapters).
 */
import type { GospelPresentationData, GospelSection } from '@/lib/types'
import { extractDiv1Blocks, passageKeysFromRefs } from '@/lib/spurgeon/ccelSermonHtml'
import { passageKeysFromGospelPresentationData } from '@/lib/spurgeon/passageKeysFromGospelData'
import {
  attrFromTag,
  div1InnerFromBlock,
  pushDiv2Subsections,
  shouldSkipEdwardsBookDiv1Title,
} from '@/lib/edwardsBooks/ccelThmlBlocks'
import {
  EDWARDS_TREATISE_ON_GRACE_SLUG,
  edwardsTreatiseOnGraceProfileTitle,
} from '@/lib/edwardsBooks/edwardsBookSlugs'
import type { ParsedEdwardsBook } from '@/lib/edwardsBooks/importEdwardsBookToSupabase'

export const CCEL_EDWARDS_TREATISE_ON_GRACE_XML_URL =
  'https://www.ccel.org/ccel/edwards/treatiseongrace.xml'

function isTreatiseOnGraceDiv1Title(title: string): boolean {
  return /^treatise on grace$/i.test(title.trim())
}

export function parseCcelEdwardsTreatiseOnGraceXml(xml: string): ParsedEdwardsBook {
  const subsections: GospelSection['subsections'] = []
  const allPassages: string[] = []

  for (const block of extractDiv1Blocks(xml)) {
    const openMatch = block.match(/^<div1\b([^>]*)>/i)
    if (!openMatch) continue
    const openTag = `<div1${openMatch[1]}>`
    const rawTitle = attrFromTag(openTag, 'title')?.trim() ?? ''
    if (!rawTitle || shouldSkipEdwardsBookDiv1Title(rawTitle)) continue
    if (!isTreatiseOnGraceDiv1Title(rawTitle)) continue

    const divInner = div1InnerFromBlock(block)
    pushDiv2Subsections(divInner, subsections, allPassages)
  }

  if (subsections.length === 0) {
    throw new Error('No Treatise on Grace div2 chapters found in ThML')
  }

  const title = edwardsTreatiseOnGraceProfileTitle()
  const gospelData: GospelPresentationData = [
    {
      section: EDWARDS_TREATISE_ON_GRACE_SLUG,
      title,
      subsections,
    },
  ]

  const fromHtml = passageKeysFromRefs(allPassages)
  const fromStored = passageKeysFromGospelPresentationData(gospelData)
  const passageKeys = [...new Set([...fromHtml, ...fromStored])].sort((a, b) => a.localeCompare(b))

  return {
    slug: EDWARDS_TREATISE_ON_GRACE_SLUG,
    title,
    gospelData,
    passageKeys,
  }
}

export function subsectionCountForTreatiseOnGrace(gospelData: GospelPresentationData): number {
  return gospelData[0]?.subsections?.length ?? 0
}
