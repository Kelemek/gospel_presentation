/**
 * Parse CCEL ThML `baxter/pastor.xml` into one gospel profile (div1 subsections).
 */
import type { GospelPresentationData, GospelSection, Subsection } from '@/lib/types'
import {
  formatCalvinParagraphBody,
  formatCalvinSubsectionHtml,
} from '@/lib/calvin/calvinHtmlFormatting'
import { decodeThmlTitle, normalizeThmlHeadingsForImport } from '@/lib/ccelThmlHeadings'

export { normalizeThmlHeadingsForImport }
import {
  extractDiv1Blocks,
  extractPassageAttributes,
  normalizedPassageDisplayForInline,
  passageKeysFromRefs,
  unwrapScripRefTags,
} from '@/lib/spurgeon/ccelSermonHtml'
import { passageKeysFromGospelPresentationData } from '@/lib/spurgeon/passageKeysFromGospelData'
import { REFORMED_PASTOR_SLUG, reformedPastorProfileTitle } from '@/lib/reformedPastor/reformedPastorSlug'

export const CCEL_REFORMED_PASTOR_XML_URL = 'https://www.ccel.org/ccel/baxter/pastor.xml'

export interface ParsedReformedPastor {
  slug: typeof REFORMED_PASTOR_SLUG
  title: string
  gospelSection: GospelSection
  passageKeys: string[]
}

function attrFromTag(tag: string, name: string): string | null {
  const re = new RegExp(`\\b${name}="([^"]*)"`, 'i')
  return re.exec(tag)?.[1]?.trim() ?? null
}

function shouldSkipDiv1Title(title: string): boolean {
  const t = title.trim()
  return /^title page$/i.test(t) || /^indexes$/i.test(t)
}

function div1InnerFromBlock(block: string): string {
  const innerMatch = block.match(/<div1\b[^>]*>([\s\S]*)<\/div1>\s*$/i)
  return innerMatch
    ? innerMatch[1]
    : block.replace(/^<div1\b[^>]*>/i, '').replace(/<\/div1>\s*$/i, '')
}

/** Strip ThML chrome that should not appear in stored subsection HTML. */
function sanitizeInner(inner: string): string {
  let s = inner
  s = s.replace(/<scripCom\b[^>]*\/?>/gi, '')
  s = s.replace(/<pb\b[^>]*\/?>/gi, '')
  s = s.replace(/<sync\b[^>]*\/?>/gi, '')
  s = s.replace(/<a\b[^>]*\/>/gi, '')
  s = normalizeThmlHeadingsForImport(s)
  return s
}

/** Convert div1 inner ThML to subsection HTML (`<p>` blocks, inline scripture). */
export function div1InnerToSubsectionHtml(inner: string): string {
  const s = sanitizeInner(inner)
  const parts: string[] = []
  const blockRe = /<(p|h5)\b[^>]*>([\s\S]*?)<\/\1>/gi
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

function subsectionFromDiv1Block(block: string): Subsection | null {
  const openMatch = block.match(/^<div1\b([^>]*)>/i)
  if (!openMatch) return null
  const openTag = `<div1${openMatch[1]}>`
  const rawTitle = attrFromTag(openTag, 'title')?.trim() ?? ''
  if (!rawTitle || shouldSkipDiv1Title(rawTitle)) return null

  const title = decodeThmlTitle(rawTitle)
  const divInner = div1InnerFromBlock(block)
  const content = div1InnerToSubsectionHtml(divInner)
  if (!content.trim()) return null

  return {
    title,
    content,
    questions: [],
  }
}

export function parseCcelReformedPastorXml(xml: string): ParsedReformedPastor {
  const subsections: Subsection[] = []
  const allPassages: string[] = []

  for (const block of extractDiv1Blocks(xml)) {
    const sub = subsectionFromDiv1Block(block)
    if (!sub) continue
    subsections.push(sub)
    allPassages.push(...passageRefsFromInner(div1InnerFromBlock(block)))
  }

  if (subsections.length === 0) {
    throw new Error('No Reformed Pastor div1 blocks found in Baxter pastor ThML')
  }

  const title = reformedPastorProfileTitle()
  const gospelSection: GospelSection = {
    section: REFORMED_PASTOR_SLUG,
    title,
    subsections,
  }

  const gospelData: GospelPresentationData = [gospelSection]
  const fromHtml = passageKeysFromRefs(allPassages)
  const fromStored = passageKeysFromGospelPresentationData(gospelData)
  const passageKeys = [...new Set([...fromHtml, ...fromStored])].sort((a, b) => a.localeCompare(b))

  return {
    slug: REFORMED_PASTOR_SLUG,
    title,
    gospelSection,
    passageKeys,
  }
}
