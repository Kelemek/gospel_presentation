/**
 * Parse CCEL ThML *Systematic Theology* (Charles Hodge) — one gospel profile per volume.
 */
import { berkhofInnerToSubsectionHtml } from '@/lib/berkhof/ccelBerkhofHtml'
import type { HodgeCcelVolumeDef } from '@/lib/hodge/hodgeCcelManifest'
import { hodgeVolumeProfileTitle, hodgeVolumeSlug } from '@/lib/hodge/hodgeSlug'
import { collectScriptureReferencesForSubsection } from '@/lib/scriptureReferencesFromHtml'
import type { GospelPresentationData, Subsection } from '@/lib/types'
import {
  extractDiv1Blocks,
  passageDisplaysFromFragment,
  passageKeysFromRefs,
} from '@/lib/spurgeon/ccelSermonHtml'
import { passageKeysFromGospelPresentationData } from '@/lib/spurgeon/passageKeysFromGospelData'
import { decodeThmlTitle } from '@/lib/watson/ccelWatsonHtml'

export interface HodgeThmlInventory {
  div1Count: number
  sections: { title: string; div2Count: number; div3Count: number; subsectionCount: number }[]
}

export interface ParsedHodgeVolume {
  slug: string
  title: string
  gospelData: GospelPresentationData
  passageKeys: string[]
}

const ROMAN_PART_RE = /^Part\s+([IVXLC]+)\./i

function attrFromTag(tag: string, name: string): string | null {
  const re = new RegExp(`\\b${name}="([^"]*)"`, 'i')
  return re.exec(tag)?.[1]?.trim() ?? null
}

function div1InnerFromBlock(block: string): string {
  const innerMatch = block.match(/<div1\b[^>]*>([\s\S]*)<\/div1>\s*$/i)
  return innerMatch
    ? innerMatch[1]
    : block.replace(/^<div1\b[^>]*>/i, '').replace(/<\/div1>\s*$/i, '')
}

function extractNestedDivBlocks(
  parentInner: string,
  tag: 'div2' | 'div3'
): { openTag: string; inner: string }[] {
  const openLen = tag.length + 1
  const closeTag = `</${tag}>`
  const closeLen = closeTag.length
  const blocks: { openTag: string; inner: string }[] = []
  const lower = parentInner
  let pos = 0
  while (pos < lower.length) {
    const marker = `<${tag}`
    const start = lower.indexOf(marker, pos)
    if (start === -1) break
    const tagEnd = lower.indexOf('>', start)
    if (tagEnd === -1) break
    const openTag = parentInner.slice(start, tagEnd + 1)
    let depth = 1
    let i = tagEnd + 1
    while (i < lower.length) {
      if (lower.slice(i, i + openLen).toLowerCase() === marker) {
        const gt = lower.indexOf('>', i)
        if (gt === -1) break
        depth++
        i = gt + 1
        continue
      }
      if (lower.slice(i, i + closeLen).toLowerCase() === closeTag) {
        depth--
        i += closeLen
        if (depth === 0) {
          blocks.push({ openTag, inner: parentInner.slice(tagEnd + 1, i - closeLen) })
          pos = i
          break
        }
        continue
      }
      i++
    }
    if (i >= lower.length) break
  }
  return blocks
}

function shouldSkipDiv1Title(title: string): boolean {
  const t = title.trim()
  if (/^title$/i.test(t)) return true
  if (/^prefatory$/i.test(t)) return true
  if (/^indexes$/i.test(t)) return true
  return false
}

export function shouldSkipHodgeDiv2Title(title: string): boolean {
  const t = title.trim()
  if (/^Index of Scripture References/i.test(t)) return true
  if (/^Greek Words and Phrases/i.test(t)) return true
  if (/^Hebrew Words and Phrases/i.test(t)) return true
  if (/^Latin Words and Phrases/i.test(t)) return true
  if (/^German Words and Phrases/i.test(t)) return true
  if (/^French Words and Phrases/i.test(t)) return true
  if (/^Index of Pages of the Print Edition/i.test(t)) return true
  return false
}

export function sectionIdFromDiv1Title(title: string): string | null {
  const t = title.trim()
  if (/^introduction$/i.test(t)) return 'intro'
  const part = ROMAN_PART_RE.exec(t)
  if (!part) return null
  if (/continued/i.test(t)) {
    return `${part[1].toLowerCase()}-continued`
  }
  return part[1].toLowerCase()
}

function isContentDiv1Title(title: string): boolean {
  return sectionIdFromDiv1Title(title) != null
}

function subsectionFromInner(title: string, inner: string): Subsection | null {
  const content = berkhofInnerToSubsectionHtml(inner)
  if (!content.trim()) return null
  const scriptureReferences = collectScriptureReferencesForSubsection({
    thmlInner: inner,
    contentHtml: content,
    title,
  })
  return { title, content, questions: [], scriptureReferences }
}

function pushSubsection(
  subsections: Subsection[],
  allPassages: string[],
  title: string,
  inner: string
): void {
  const sub = subsectionFromInner(title, inner)
  if (!sub) return
  subsections.push(sub)
  allPassages.push(...passageDisplaysFromFragment(inner))
  for (const sr of sub.scriptureReferences || []) {
    if (sr.reference?.trim()) allPassages.push(sr.reference.trim())
  }
}

function parseSectionSubsections(sectionInner: string): Subsection[] {
  const subsections: Subsection[] = []
  const allPassages: string[] = []
  const div2Blocks = extractNestedDivBlocks(sectionInner, 'div2')

  if (div2Blocks.length === 0) {
    pushSubsection(subsections, allPassages, 'Body', sectionInner)
  } else {
    for (const { openTag: div2OpenTag, inner: div2Inner } of div2Blocks) {
      const rawDiv2Title = attrFromTag(div2OpenTag, 'title')?.trim()
      if (!rawDiv2Title) continue
      const div2Title = decodeThmlTitle(rawDiv2Title)
      if (shouldSkipHodgeDiv2Title(div2Title)) continue

      const div3Blocks = extractNestedDivBlocks(div2Inner, 'div3')
      if (div3Blocks.length === 0) {
        pushSubsection(subsections, allPassages, div2Title, div2Inner)
        continue
      }

      for (const { openTag: div3OpenTag, inner: div3Inner } of div3Blocks) {
        const rawDiv3Title = attrFromTag(div3OpenTag, 'title')?.trim()
        if (!rawDiv3Title) continue
        const div3Title = decodeThmlTitle(rawDiv3Title)
        const title = `${div2Title} — ${div3Title}`
        pushSubsection(subsections, allPassages, title, div3Inner)
      }
    }
  }

  if (subsections.length === 0) {
    throw new Error('No Hodge subsections found in div1 section')
  }

  return subsections
}

function countSubsectionsInSection(sectionInner: string): number {
  const div2Blocks = extractNestedDivBlocks(sectionInner, 'div2')
  if (div2Blocks.length === 0) {
    return sectionInner.trim() ? 1 : 0
  }
  let n = 0
  for (const { openTag, inner } of div2Blocks) {
    const rawTitle = attrFromTag(openTag, 'title')?.trim() ?? ''
    if (!rawTitle || shouldSkipHodgeDiv2Title(decodeThmlTitle(rawTitle))) continue
    const div3Blocks = extractNestedDivBlocks(inner, 'div3')
    n += div3Blocks.length > 0 ? div3Blocks.length : 1
  }
  return n
}

/** Summarize ThML structure for `import-hodge --parse-only`. */
export function inventoryHodgeThml(xml: string): HodgeThmlInventory {
  const sections: HodgeThmlInventory['sections'] = []
  let div1Count = 0

  for (const block of extractDiv1Blocks(xml)) {
    div1Count++
    const openMatch = block.match(/^<div1\b([^>]*)>/i)
    if (!openMatch) continue
    const openTag = `<div1${openMatch[1]}>`
    const rawTitle = attrFromTag(openTag, 'title')?.trim() ?? ''
    if (!rawTitle || !isContentDiv1Title(rawTitle)) continue

    const sectionInner = div1InnerFromBlock(block)
    const div2Blocks = extractNestedDivBlocks(sectionInner, 'div2')
    let div3Count = 0
    for (const { inner, openTag: d2Open } of div2Blocks) {
      const d2Title = decodeThmlTitle(attrFromTag(d2Open, 'title') ?? '')
      if (shouldSkipHodgeDiv2Title(d2Title)) continue
      div3Count += extractNestedDivBlocks(inner, 'div3').length
    }

    sections.push({
      title: decodeThmlTitle(rawTitle),
      div2Count: div2Blocks.filter(({ openTag: d2Open }) => {
        const d2Title = decodeThmlTitle(attrFromTag(d2Open, 'title') ?? '')
        return !shouldSkipHodgeDiv2Title(d2Title)
      }).length,
      div3Count,
      subsectionCount: countSubsectionsInSection(sectionInner),
    })
  }

  return { div1Count, sections }
}

export function parseCcelHodgeVolumeXml(xml: string, volume: HodgeCcelVolumeDef): ParsedHodgeVolume {
  const gospelData: GospelPresentationData = []
  const allPassages: string[] = []

  for (const block of extractDiv1Blocks(xml)) {
    const openMatch = block.match(/^<div1\b([^>]*)>/i)
    if (!openMatch) continue
    const openTag = `<div1${openMatch[1]}>`
    const rawTitle = attrFromTag(openTag, 'title')?.trim() ?? ''
    if (!rawTitle || shouldSkipDiv1Title(rawTitle) || !isContentDiv1Title(rawTitle)) continue

    const sectionId = sectionIdFromDiv1Title(rawTitle)
    if (!sectionId) continue

    const sectionTitle = decodeThmlTitle(rawTitle)
    const subsections = parseSectionSubsections(div1InnerFromBlock(block))
    for (const sub of subsections) {
      allPassages.push(...passageDisplaysFromFragment(sub.content))
      for (const sr of sub.scriptureReferences || []) {
        if (sr.reference?.trim()) allPassages.push(sr.reference.trim())
      }
    }

    gospelData.push({
      section: sectionId,
      title: sectionTitle,
      subsections,
    })
  }

  if (gospelData.length === 0) {
    throw new Error(`No gospel sections parsed for Hodge volume ${volume.volume}`)
  }

  const title = volume.profileTitle
  const fromHtml = passageKeysFromRefs(allPassages)
  const fromStored = passageKeysFromGospelPresentationData(gospelData)
  const passageKeys = [...new Set([...fromHtml, ...fromStored])].sort((a, b) => a.localeCompare(b))

  return {
    slug: volume.slug,
    title,
    gospelData,
    passageKeys,
  }
}

export function subsectionCountForHodge(gospelData: GospelPresentationData): number {
  return gospelData.reduce((n, sec) => n + (sec.subsections?.length ?? 0), 0)
}

export function hodgeVolumeSlugForParse(volume: HodgeCcelVolumeDef['volume']): string {
  return hodgeVolumeSlug(volume)
}

export function hodgeVolumeTitleForParse(volume: HodgeCcelVolumeDef['volume']): string {
  return hodgeVolumeProfileTitle(volume)
}
