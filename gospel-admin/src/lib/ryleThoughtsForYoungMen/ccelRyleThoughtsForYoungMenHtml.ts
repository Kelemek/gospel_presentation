/**
 * Parse CCEL ThML `ryle/upper_room.xml` Chapter XIX into one gospel profile.
 */
import {
  formatCalvinParagraphBody,
  formatCalvinSubsectionHtml,
} from '@/lib/calvin/calvinHtmlFormatting'
import { normalizeThmlHeadingsForImport } from '@/lib/ccelThmlHeadings'
import type { GospelPresentationData, GospelSection, Subsection } from '@/lib/types'
import {
  RYLE_THOUGHTS_FOR_YOUNG_MEN_SLUG,
  ryleThoughtsForYoungMenProfileTitle,
} from '@/lib/ryleThoughtsForYoungMen/ryleThoughtsForYoungMenSlug'
import {
  extractDiv1Blocks,
  extractPassageAttributes,
  normalizedPassageDisplayForInline,
  passageKeysFromRefs,
  unwrapScripRefTags,
} from '@/lib/spurgeon/ccelSermonHtml'
import { passageKeysFromGospelPresentationData } from '@/lib/spurgeon/passageKeysFromGospelData'

export const CCEL_RYLE_UPPER_ROOM_XML_URL = 'https://www.ccel.org/ccel/ryle/upper_room.xml'

export const CHAPTER_XIX_DIV1_ID = 'xxi'

export interface ParsedRyleThoughtsForYoungMen {
  slug: typeof RYLE_THOUGHTS_FOR_YOUNG_MEN_SLUG
  title: string
  gospelSection: GospelSection
  passageKeys: string[]
}

type SectionKey = 'introduction' | 'reasons' | 'dangers' | 'counsels' | 'rules' | 'conclusion'

const SECTION_ORDER: SectionKey[] = [
  'introduction',
  'reasons',
  'dangers',
  'counsels',
  'rules',
  'conclusion',
]

const SECTION_TITLES: Record<SectionKey, string> = {
  introduction: 'Introduction',
  reasons: 'Reasons for Exhorting Young Men',
  dangers: 'Dangers to Young Men',
  counsels: 'General Counsels to Young Men',
  rules: 'Special Rules for Young Men',
  conclusion: 'Conclusion',
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

function plainTextFromHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#160;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function sectionKeyFromParagraphPlain(plain: string): SectionKey | null {
  if (/^I\. Reasons for exhorting Young Men\.?$/i.test(plain)) return 'reasons'
  if (/^II\. Dangers of Young Men\.?$/i.test(plain)) return 'dangers'
  if (/^III\. General Counsels to Young Men\.?$/i.test(plain)) return 'counsels'
  if (/^IV\. Special Rules for Young Men\.?$/i.test(plain)) return 'rules'
  if (/^V\. Conclusion\.?$/i.test(plain)) return 'conclusion'
  return null
}

/** Strip ThML chrome that should not appear in stored subsection HTML. */
function sanitizeInner(inner: string): string {
  let s = inner
  s = s.replace(/<scripCom\b[^>]*\/?>/gi, '')
  s = s.replace(/<pb\b[^>]*\/?>/gi, '')
  s = s.replace(/<sync\b[^>]*\/?>/gi, '')
  s = s.replace(/<a\b[^>]*\/>/gi, '')
  s = s.replace(/<note\b[^>]*>[\s\S]*?<\/note>/gi, '')
  s = normalizeThmlHeadingsForImport(s)
  return s
}

/** Convert ThML inner to subsection HTML (`<p>` blocks, inline scripture). */
export function ryleThoughtsForYoungMenInnerToSubsectionHtml(inner: string): string {
  const s = sanitizeInner(inner)
  const parts: string[] = []
  const blockRe = /<(p|h3|h5)\b[^>]*>([\s\S]*?)<\/\1>/gi
  let m: RegExpExecArray | null
  let prevBody: string | null = null
  while ((m = blockRe.exec(s)) !== null) {
    const raw = unwrapScripRefTags(m[2]).trim()
    if (!raw || raw === '&#160;' || raw === '&nbsp;') continue
    const body = formatCalvinParagraphBody(raw, prevBody)
    parts.push(`<p>${body}</p>`)
    prevBody = raw
  }
  if (parts.length === 0) {
    const plain = unwrapScripRefTags(s).trim()
    if (!plain) return ''
    return `<p>${formatCalvinParagraphBody(plain, null)}</p>`
  }
  return formatCalvinSubsectionHtml(parts.join(''))
}

function passageRefsFromInner(inner: string): string[] {
  return extractPassageAttributes(inner).map((r) => normalizedPassageDisplayForInline(r))
}

function extractParagraphBlocks(chapterInner: string): string[] {
  const blocks: string[] = []
  const blockRe = /<(p|h3|h5)\b[^>]*>[\s\S]*?<\/\1>/gi
  let m: RegExpExecArray | null
  while ((m = blockRe.exec(chapterInner)) !== null) {
    blocks.push(m[0])
  }
  return blocks
}

function groupParagraphsIntoSections(chapterInner: string): Map<SectionKey, string[]> {
  const grouped = new Map<SectionKey, string[]>()
  for (const key of SECTION_ORDER) {
    grouped.set(key, [])
  }

  let current: SectionKey = 'introduction'
  for (const block of extractParagraphBlocks(chapterInner)) {
    const innerMatch = block.match(/^<(p|h3|h5)\b[^>]*>([\s\S]*)<\/\1>$/i)
    const blockInner = innerMatch?.[2] ?? block
    const plain = plainTextFromHtml(blockInner)
    if (!plain) continue

    const sectionStart = sectionKeyFromParagraphPlain(plain)
    if (sectionStart) {
      current = sectionStart
    }

    grouped.get(current)!.push(block)
  }

  return grouped
}

export function extractChapterXixInnerFromUpperRoomXml(xml: string): string {
  for (const block of extractDiv1Blocks(xml)) {
    const openMatch = block.match(/^<div1\b([^>]*)>/i)
    if (!openMatch) continue
    const openTag = `<div1${openMatch[1]}>`
    const id = attrFromTag(openTag, 'id')
    const title = attrFromTag(openTag, 'title')?.trim() ?? ''
    if (id === CHAPTER_XIX_DIV1_ID || /^chapter xix$/i.test(title)) {
      return div1InnerFromBlock(block)
    }
  }
  throw new Error('Chapter XIX (Thoughts for Young Men) not found in upper_room ThML')
}

function subsectionFromGroupedBlocks(title: string, blocks: string[]): Subsection | null {
  const inner = blocks.join('\n')
  const content = ryleThoughtsForYoungMenInnerToSubsectionHtml(inner)
  if (!content.trim()) return null
  return {
    title,
    content,
    questions: [],
  }
}

export function parseCcelRyleThoughtsForYoungMenXml(xml: string): ParsedRyleThoughtsForYoungMen {
  const chapterInner = extractChapterXixInnerFromUpperRoomXml(xml)
  const grouped = groupParagraphsIntoSections(chapterInner)
  const subsections: Subsection[] = []
  const allPassages: string[] = []

  for (const key of SECTION_ORDER) {
    const blocks = grouped.get(key) ?? []
    const sub = subsectionFromGroupedBlocks(SECTION_TITLES[key], blocks)
    if (!sub) continue
    subsections.push(sub)
    allPassages.push(...passageRefsFromInner(blocks.join('\n')))
  }

  if (subsections.length === 0) {
    throw new Error('No Thoughts for Young Men subsections found in upper_room ThML')
  }

  const title = ryleThoughtsForYoungMenProfileTitle()
  const gospelSection: GospelSection = {
    section: RYLE_THOUGHTS_FOR_YOUNG_MEN_SLUG,
    title,
    subsections,
  }

  const gospelData: GospelPresentationData = [gospelSection]
  const fromHtml = passageKeysFromRefs(allPassages)
  const fromStored = passageKeysFromGospelPresentationData(gospelData)
  const passageKeys = [...new Set([...fromHtml, ...fromStored])].sort((a, b) => a.localeCompare(b))

  return {
    slug: RYLE_THOUGHTS_FOR_YOUNG_MEN_SLUG,
    title,
    gospelSection,
    passageKeys,
  }
}
