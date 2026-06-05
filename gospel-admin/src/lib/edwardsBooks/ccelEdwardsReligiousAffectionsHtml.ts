/**
 * Parse CCEL ThML `edwards/affections.xml` into three Part gospel sections.
 */
import type { GospelPresentationData, Subsection } from '@/lib/types'
import { extractDiv1Blocks, passageKeysFromRefs } from '@/lib/spurgeon/ccelSermonHtml'
import { passageKeysFromGospelPresentationData } from '@/lib/spurgeon/passageKeysFromGospelData'
import { decodeThmlTitle } from '@/lib/ccelThmlHeadings'
import {
  attrFromTag,
  div1InnerFromBlock,
  extractDiv2Blocks,
  parsePartDiv1Subsections,
  passageRefsFromInner,
  pushDiv2Subsections,
  shouldSkipEdwardsBookDiv1Title,
  subsectionFromInner,
} from '@/lib/edwardsBooks/ccelThmlBlocks'
import {
  EDWARDS_RELIGIOUS_AFFECTIONS_SLUG,
  edwardsReligiousAffectionsProfileTitle,
} from '@/lib/edwardsBooks/edwardsBookSlugs'
import type { ParsedEdwardsBook } from '@/lib/edwardsBooks/importEdwardsBookToSupabase'

export const CCEL_EDWARDS_RELIGIOUS_AFFECTIONS_XML_URL =
  'https://www.ccel.org/ccel/edwards/affections.xml'

function partNumberFromDiv1Title(title: string): number | null {
  const m = /^Part\s+(I{1,3})\b/i.exec(title.trim())
  if (!m) return null
  const map: Record<string, number> = { I: 1, II: 2, III: 3 }
  return map[m[1].toUpperCase()] ?? null
}

function isPartDiv1Title(title: string): boolean {
  return partNumberFromDiv1Title(title) != null
}

function isIntroductionDiv1Title(title: string): boolean {
  return /^introduction$/i.test(title.trim())
}

/** CCEL nests Part III §I as its own `div1` with §II–XII as inner `div2`. */
function isPartIIISectionOneDiv1Title(title: string): boolean {
  return /^I\.\s+Affections that are truly spiritual/i.test(title.trim())
}

function parsePartIIIFromSectionOneDiv1(block: string): Subsection[] {
  const openMatch = block.match(/^<div1\b([^>]*)>/i)
  if (!openMatch) return []
  const openTag = `<div1${openMatch[1]}>`
  const rawTitle = attrFromTag(openTag, 'title')?.trim() ?? ''
  const sectionITitle = decodeThmlTitle(rawTitle)
  const inner = div1InnerFromBlock(block)
  const div2Blocks = extractDiv2Blocks(inner)

  const subsections: Subsection[] = []
  const allPassages: string[] = []

  if (div2Blocks.length > 0) {
    const firstPos = inner.indexOf(div2Blocks[0].openTag)
    const sectionIInner = firstPos > 0 ? inner.slice(0, firstPos) : inner
    const subI = subsectionFromInner(sectionITitle, sectionIInner)
    if (subI) {
      subsections.push(subI)
      allPassages.push(...passageRefsFromInner(sectionIInner))
    }
    pushDiv2Subsections(inner, subsections, allPassages)
  } else {
    const sub = subsectionFromInner(sectionITitle, inner)
    if (sub) subsections.push(sub)
  }

  if (subsections.length === 0) {
    throw new Error('No Part III subsections found in Religious Affections ThML')
  }

  return subsections
}

export function parseCcelEdwardsReligiousAffectionsXml(xml: string): ParsedEdwardsBook {
  const gospelData: GospelPresentationData = []
  const allPassages: string[] = []
  let introductionInner: string | null = null
  let partIIITitle = 'Part III.'

  for (const block of extractDiv1Blocks(xml)) {
    const openMatch = block.match(/^<div1\b([^>]*)>/i)
    if (!openMatch) continue
    const openTag = `<div1${openMatch[1]}>`
    const rawTitle = attrFromTag(openTag, 'title')?.trim() ?? ''
    if (!rawTitle || shouldSkipEdwardsBookDiv1Title(rawTitle)) continue

    if (isIntroductionDiv1Title(rawTitle)) {
      introductionInner = div1InnerFromBlock(block)
      continue
    }

    if (isPartIIISectionOneDiv1Title(rawTitle)) {
      const subsections = parsePartIIIFromSectionOneDiv1(block)
      allPassages.push(...passageRefsFromInner(div1InnerFromBlock(block)))
      gospelData.push({
        section: '3',
        title: partIIITitle,
        subsections,
      })
      continue
    }

    if (!isPartDiv1Title(rawTitle)) continue

    const partNum = partNumberFromDiv1Title(rawTitle)
    if (partNum == null) continue

    const partTitle = decodeThmlTitle(rawTitle)
    const partInner = div1InnerFromBlock(block)

    if (partNum === 3 && /^part iii\.?$/i.test(rawTitle.trim())) {
      partIIITitle = partTitle
      continue
    }

    const subsections: Subsection[] = []

    if (partNum === 1 && introductionInner) {
      const intro = subsectionFromInner('Introduction', introductionInner)
      if (intro) {
        subsections.push(intro)
        allPassages.push(...passageRefsFromInner(introductionInner))
      }
      introductionInner = null
    }

    const partSubs = parsePartDiv1Subsections(partInner, partTitle)
    subsections.push(...partSubs)
    allPassages.push(...passageRefsFromInner(partInner))

    gospelData.push({
      section: String(partNum),
      title: partTitle,
      subsections,
    })
  }

  if (introductionInner) {
    const intro = subsectionFromInner('Introduction', introductionInner)
    if (intro && gospelData.length > 0) {
      gospelData[0].subsections.unshift(intro)
      allPassages.push(...passageRefsFromInner(introductionInner))
    }
  }

  if (gospelData.length !== 3) {
    throw new Error(
      `Expected 3 Part sections in Religious Affections ThML, found ${gospelData.length}`
    )
  }

  gospelData.sort((a, b) => Number(a.section) - Number(b.section))

  const title = edwardsReligiousAffectionsProfileTitle()
  const fromHtml = passageKeysFromRefs(allPassages)
  const fromStored = passageKeysFromGospelPresentationData(gospelData)
  const passageKeys = [...new Set([...fromHtml, ...fromStored])].sort((a, b) => a.localeCompare(b))

  return {
    slug: EDWARDS_RELIGIOUS_AFFECTIONS_SLUG,
    title,
    gospelData,
    passageKeys,
  }
}
