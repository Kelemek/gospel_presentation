/**
 * Parse CCEL ThML `luther/bondage.xml` into gospel sections (prefatory, three discussion parts, conclusion).
 */
import type { GospelPresentationData, Subsection } from '@/lib/types'
import { decodeThmlTitle } from '@/lib/ccelThmlHeadings'
import {
  attrFromTag,
  div1InnerFromBlock,
  extractDiv2Blocks,
  passageRefsFromInner,
  subsectionFromInner,
} from '@/lib/edwardsBooks/ccelThmlBlocks'
import { extractDiv1Blocks, passageKeysFromRefs } from '@/lib/spurgeon/ccelSermonHtml'
import { passageKeysFromGospelPresentationData } from '@/lib/spurgeon/passageKeysFromGospelData'
import { LUTHER_BONDAGE_SLUG, lutherBondageProfileTitle } from '@/lib/lutherBondage/lutherBondageSlug'

export const CCEL_LUTHER_BONDAGE_XML_URL = 'https://www.ccel.org/ccel/luther/bondage.xml'

export interface ParsedLutherBondage {
  slug: typeof LUTHER_BONDAGE_SLUG
  title: string
  gospelData: GospelPresentationData
  passageKeys: string[]
}

function shouldSkipDiv1Title(title: string): boolean {
  const t = title.trim()
  return /^title page$/i.test(t) || /^indexes$/i.test(t)
}

function isDiscussionPartTitle(title: string): boolean {
  return /^Discussion:\s*(First|Second|Third)\s+Part$/i.test(title.trim())
}

function discussionSectionKey(title: string): string {
  if (/first/i.test(title)) return 'discussion-1'
  if (/second/i.test(title)) return 'discussion-2'
  if (/third/i.test(title)) return 'discussion-3'
  return 'discussion'
}

function subsectionsFromDiscussionDiv1(div1Title: string, inner: string): Subsection[] {
  const subsections: Subsection[] = []
  const passages: string[] = []
  for (const { openTag, inner: div2Inner } of extractDiv2Blocks(inner)) {
    const rawSub = attrFromTag(openTag, 'title')?.trim() ?? ''
    if (!rawSub) continue
    const subTitle = `${div1Title} — ${decodeThmlTitle(rawSub)}`
    const sub = subsectionFromInner(subTitle, div2Inner)
    if (!sub) continue
    subsections.push(sub)
    passages.push(...passageRefsFromInner(div2Inner))
  }
  if (subsections.length === 0) {
    throw new Error(`No Section div2 blocks in ${div1Title}`)
  }
  return subsections
}

export function parseCcelLutherBondageXml(xml: string): ParsedLutherBondage {
  const gospelData: GospelPresentationData = []
  const allPassages: string[] = []
  let prefatorySubsections: Subsection[] = []
  let afterSubsections: Subsection[] = []
  let seenDiscussion = false

  const flushPrefatory = () => {
    if (prefatorySubsections.length === 0) return
    gospelData.push({
      section: 'prefatory',
      title: 'Prefatory Material',
      subsections: prefatorySubsections,
    })
    prefatorySubsections = []
  }

  const flushAfter = () => {
    if (afterSubsections.length === 0) return
    gospelData.push({
      section: 'conclusion',
      title: 'Conclusion and Appendices',
      subsections: afterSubsections,
    })
    afterSubsections = []
  }

  for (const block of extractDiv1Blocks(xml)) {
    const openMatch = block.match(/^<div1\b([^>]*)>/i)
    if (!openMatch) continue
    const openTag = `<div1${openMatch[1]}>`
    const rawTitle = attrFromTag(openTag, 'title')?.trim() ?? ''
    if (!rawTitle || shouldSkipDiv1Title(rawTitle)) continue

    const div1Title = decodeThmlTitle(rawTitle)
    const inner = div1InnerFromBlock(block)

    if (isDiscussionPartTitle(div1Title)) {
      flushPrefatory()
      flushAfter()
      seenDiscussion = true

      const subsections = subsectionsFromDiscussionDiv1(div1Title, inner)
      allPassages.push(...passageRefsFromInner(inner))
      gospelData.push({
        section: discussionSectionKey(div1Title),
        title: div1Title,
        subsections,
      })
      continue
    }

    const sub = subsectionFromInner(div1Title, inner)
    if (!sub) continue
    allPassages.push(...passageRefsFromInner(inner))

    if (!seenDiscussion) {
      prefatorySubsections.push(sub)
    } else {
      afterSubsections.push(sub)
    }
  }

  flushPrefatory()
  flushAfter()

  if (gospelData.length === 0) {
    throw new Error('No Bondage of the Will div1 blocks found in Luther bondage ThML')
  }

  const discussionParts = gospelData.filter((s) => s.section.startsWith('discussion-'))
  if (discussionParts.length !== 3) {
    throw new Error(
      `Expected 3 Discussion Part sections in Bondage ThML, found ${discussionParts.length}`
    )
  }

  const title = lutherBondageProfileTitle()
  const fromHtml = passageKeysFromRefs(allPassages)
  const fromStored = passageKeysFromGospelPresentationData(gospelData)
  const passageKeys = [...new Set([...fromHtml, ...fromStored])].sort((a, b) => a.localeCompare(b))

  return {
    slug: LUTHER_BONDAGE_SLUG,
    title,
    gospelData,
    passageKeys,
  }
}
