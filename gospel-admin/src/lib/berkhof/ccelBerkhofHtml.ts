/**
 * Parse CCEL ThML *Systematic Theology* (Louis Berkhof) into six gospel sections (Parts 1–6).
 */
import { boldBerkhofOutlineMarkers } from '@/lib/berkhof/berkhofHtmlFormatting'
import {
  formatCalvinParagraphBody,
  formatCalvinSubsectionHtml,
} from '@/lib/calvin/calvinHtmlFormatting'
import { BERKHOF_ST_SLUG, berkhofProfileTitle } from '@/lib/berkhof/berkhofSlug'
import { collectScriptureReferencesForSubsection } from '@/lib/scriptureReferencesFromHtml'
import {
  expandCommaBetweenDistinctScriptureRefs,
  expandSameChapterCommaVerseOrSeparate,
} from '@/lib/scriptureReferenceNormalize'
import type { GospelPresentationData, Subsection } from '@/lib/types'
import {
  extractDiv1Blocks,
  passageDisplaysFromFragment,
  passageKeysFromRefs,
  unwrapScripRefTags,
} from '@/lib/spurgeon/ccelSermonHtml'
import { passageKeysFromGospelPresentationData } from '@/lib/spurgeon/passageKeysFromGospelData'
import { decodeThmlTitle } from '@/lib/watson/ccelWatsonHtml'

export const CCEL_BERKHOF_XML_URL =
  'https://www.ccel.org/ccel/berkhof/systematictheology.xml'

export interface BerkhofThmlInventory {
  div1Count: number
  partDiv1s: { title: string; div2Count: number; div3Count: number; subsectionCount: number }[]
}

export interface ParsedBerkhofSystematicTheology {
  slug: string
  title: string
  gospelData: GospelPresentationData
  passageKeys: string[]
}

const PART_WORD_TO_NUM: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
}

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
  if (/^title page$/i.test(t)) return true
  if (/^preface$/i.test(t)) return true
  if (/^contents$/i.test(t)) return true
  if (/^indexes$/i.test(t)) return true
  return false
}

export function partNumberFromDiv1Title(title: string): number | null {
  const m = /^Part\s+(One|Two|Three|Four|Five|Six)\s*:/i.exec(title.trim())
  if (!m) return null
  return PART_WORD_TO_NUM[m[1].toLowerCase()] ?? null
}

function isPartDiv1Title(title: string): boolean {
  return partNumberFromDiv1Title(title) != null
}

/** Strip ThML chrome that should not appear in stored subsection HTML. */
function sanitizeInner(inner: string): string {
  let s = inner
  s = s.replace(/<scripCom\b[^>]*\/?>/gi, '')
  s = s.replace(/<pb\b[^>]*\/?>/gi, '')
  s = s.replace(/<sync\b[^>]*\/?>/gi, '')
  s = s.replace(/<a\b[^>]*\/>/gi, '')
  s = s.replace(/<note\b[^>]*>[\s\S]*?<\/note>/gi, '')
  s = s.replace(/<h2\b[^>]*>[\s\S]*?<\/h2>/gi, '')
  s = s.replace(/<h3\b[^>]*>[\s\S]*?<\/h3>/gi, '')
  return s
}

/** Convert ThML inner to subsection HTML (`<p>` blocks, inline scripture). */
export function berkhofInnerToSubsectionHtml(inner: string): string {
  const s = sanitizeInner(inner)
  const parts: string[] = []
  const blockRe = /<(p|h4|h5)\b[^>]*>([\s\S]*?)<\/\1>/gi
  let m: RegExpExecArray | null
  let prevBody: string | null = null
  while ((m = blockRe.exec(s)) !== null) {
    const tag = m[1].toLowerCase()
    const raw = expandSameChapterCommaVerseOrSeparate(
      expandCommaBetweenDistinctScriptureRefs(unwrapScripRefTags(m[2]).trim())
    )
    if (!raw || raw === '&#160;' || raw === '&nbsp;') continue
    const body = formatCalvinParagraphBody(boldBerkhofOutlineMarkers(raw), prevBody)
    if (tag === 'h4') {
      parts.push(`<p><strong>${body}</strong></p>`)
    } else {
      parts.push(`<p>${body}</p>`)
    }
    prevBody = raw
  }
  if (parts.length === 0) {
    const plain = unwrapScripRefTags(s).trim()
    if (!plain) return ''
    return `<p>${formatCalvinParagraphBody(boldBerkhofOutlineMarkers(plain), null)}</p>`
  }
  return formatCalvinSubsectionHtml(parts.join(''))
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

function parsePartSubsections(partInner: string): Subsection[] {
  const subsections: Subsection[] = []
  const allPassages: string[] = []
  const div2Blocks = extractNestedDivBlocks(partInner, 'div2')

  if (div2Blocks.length === 0) {
    pushSubsection(subsections, allPassages, 'Introduction', partInner)
  } else {
    for (const { openTag: div2OpenTag, inner: div2Inner } of div2Blocks) {
      const rawDiv2Title = attrFromTag(div2OpenTag, 'title')?.trim()
      if (!rawDiv2Title) continue
      const div2Title = decodeThmlTitle(rawDiv2Title)
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
    throw new Error('No Berkhof subsections found in Part div1')
  }

  return subsections
}

/** Summarize ThML structure for `import-berkhof --parse-only`. */
export function inventoryBerkhofThml(xml: string): BerkhofThmlInventory {
  const partDiv1s: BerkhofThmlInventory['partDiv1s'] = []
  let div1Count = 0

  for (const block of extractDiv1Blocks(xml)) {
    div1Count++
    const openMatch = block.match(/^<div1\b([^>]*)>/i)
    if (!openMatch) continue
    const openTag = `<div1${openMatch[1]}>`
    const rawTitle = attrFromTag(openTag, 'title')?.trim() ?? ''
    if (!rawTitle || !isPartDiv1Title(rawTitle)) continue

    const partInner = div1InnerFromBlock(block)
    const div2Blocks = extractNestedDivBlocks(partInner, 'div2')
    let div3Count = 0
    for (const { inner } of div2Blocks) {
      div3Count += extractNestedDivBlocks(inner, 'div3').length
    }
    let subsectionCount = 0
    for (const { inner: d2 } of div2Blocks) {
      const d3 = extractNestedDivBlocks(d2, 'div3')
      subsectionCount += d3.length > 0 ? d3.length : 1
    }
    if (div2Blocks.length === 0 && partInner.trim()) subsectionCount = 1

    partDiv1s.push({
      title: decodeThmlTitle(rawTitle),
      div2Count: div2Blocks.length,
      div3Count,
      subsectionCount,
    })
  }

  return { div1Count, partDiv1s }
}

export function parseCcelBerkhofXml(xml: string): ParsedBerkhofSystematicTheology {
  const gospelData: GospelPresentationData = []
  const allPassages: string[] = []

  for (const block of extractDiv1Blocks(xml)) {
    const openMatch = block.match(/^<div1\b([^>]*)>/i)
    if (!openMatch) continue
    const openTag = `<div1${openMatch[1]}>`
    const rawTitle = attrFromTag(openTag, 'title')?.trim() ?? ''
    if (!rawTitle || shouldSkipDiv1Title(rawTitle) || !isPartDiv1Title(rawTitle)) continue

    const partNum = partNumberFromDiv1Title(rawTitle)
    if (partNum == null) continue

    const partTitle = decodeThmlTitle(rawTitle)
    const subsections = parsePartSubsections(div1InnerFromBlock(block))
    for (const sub of subsections) {
      allPassages.push(...passageDisplaysFromFragment(sub.content))
      for (const sr of sub.scriptureReferences || []) {
        if (sr.reference?.trim()) allPassages.push(sr.reference.trim())
      }
    }

    gospelData.push({
      section: String(partNum),
      title: partTitle,
      subsections,
    })
  }

  if (gospelData.length !== 6) {
    throw new Error(
      `Expected 6 Part sections in Berkhof ThML, found ${gospelData.length} (check div1 titles)`
    )
  }

  gospelData.sort((a, b) => Number(a.section) - Number(b.section))

  const title = berkhofProfileTitle()
  const fromHtml = passageKeysFromRefs(allPassages)
  const fromStored = passageKeysFromGospelPresentationData(gospelData)
  const passageKeys = [...new Set([...fromHtml, ...fromStored])].sort((a, b) => a.localeCompare(b))

  return {
    slug: BERKHOF_ST_SLUG,
    title,
    gospelData,
    passageKeys,
  }
}

export function subsectionCountForBerkhof(gospelData: GospelPresentationData): number {
  return gospelData.reduce((n, sec) => n + (sec.subsections?.length ?? 0), 0)
}
