/**
 * Parse CCEL ThML `edwards/will.xml` into four Part gospel sections.
 */
import type { GospelPresentationData } from '@/lib/types'
import { extractDiv1Blocks, passageKeysFromRefs } from '@/lib/spurgeon/ccelSermonHtml'
import { passageKeysFromGospelPresentationData } from '@/lib/spurgeon/passageKeysFromGospelData'
import { decodeThmlTitle } from '@/lib/ccelThmlHeadings'
import {
  attrFromTag,
  div1InnerFromBlock,
  parsePartDiv1Subsections,
  passageRefsFromInner,
  shouldSkipEdwardsBookDiv1Title,
} from '@/lib/edwardsBooks/ccelThmlBlocks'
import {
  EDWARDS_FREEDOM_OF_WILL_SLUG,
  edwardsFreedomOfWillProfileTitle,
} from '@/lib/edwardsBooks/edwardsBookSlugs'
import type { ParsedEdwardsBook } from '@/lib/edwardsBooks/importEdwardsBookToSupabase'

export const CCEL_EDWARDS_FREEDOM_OF_WILL_XML_URL = 'https://www.ccel.org/ccel/edwards/will.xml'

function partNumberFromDiv1Title(title: string): number | null {
  const m = /^Part\s+(I{1,3}|IV)\b/i.exec(title.trim())
  if (!m) return null
  const token = m[1].toUpperCase()
  const map: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4 }
  return map[token] ?? null
}

function isPartDiv1Title(title: string): boolean {
  return partNumberFromDiv1Title(title) != null
}

export function parseCcelEdwardsFreedomOfWillXml(xml: string): ParsedEdwardsBook {
  const gospelData: GospelPresentationData = []
  const allPassages: string[] = []

  for (const block of extractDiv1Blocks(xml)) {
    const openMatch = block.match(/^<div1\b([^>]*)>/i)
    if (!openMatch) continue
    const openTag = `<div1${openMatch[1]}>`
    const rawTitle = attrFromTag(openTag, 'title')?.trim() ?? ''
    if (!rawTitle || shouldSkipEdwardsBookDiv1Title(rawTitle) || !isPartDiv1Title(rawTitle)) continue

    const partNum = partNumberFromDiv1Title(rawTitle)
    if (partNum == null) continue

    const partTitle = decodeThmlTitle(rawTitle)
    const partInner = div1InnerFromBlock(block)
    const subsections = parsePartDiv1Subsections(partInner, partTitle)

    allPassages.push(...passageRefsFromInner(partInner))

    gospelData.push({
      section: String(partNum),
      title: partTitle,
      subsections,
    })
  }

  if (gospelData.length !== 4) {
    throw new Error(
      `Expected 4 Part sections in Freedom of the Will ThML, found ${gospelData.length}`
    )
  }

  gospelData.sort((a, b) => Number(a.section) - Number(b.section))

  const title = edwardsFreedomOfWillProfileTitle()
  const fromHtml = passageKeysFromRefs(allPassages)
  const fromStored = passageKeysFromGospelPresentationData(gospelData)
  const passageKeys = [...new Set([...fromHtml, ...fromStored])].sort((a, b) => a.localeCompare(b))

  return {
    slug: EDWARDS_FREEDOM_OF_WILL_SLUG,
    title,
    gospelData,
    passageKeys,
  }
}
