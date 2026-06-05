/**
 * Parse CCEL ThML `ryle/holiness.xml` into one gospel profile (Introduction + div2 chapters).
 */
import {
  formatCalvinParagraphBody,
  formatCalvinSubsectionHtml,
} from '@/lib/calvin/calvinHtmlFormatting'
import { normalizeThmlHeadingsForImport } from '@/lib/ccelThmlHeadings'
import type { GospelPresentationData, GospelSection, Subsection } from '@/lib/types'
import {
  extractDiv1Blocks,
  extractPassageAttributes,
  normalizedPassageDisplayForInline,
  passageKeysFromRefs,
  unwrapScripRefTags,
} from '@/lib/spurgeon/ccelSermonHtml'
import { passageKeysFromGospelPresentationData } from '@/lib/spurgeon/passageKeysFromGospelData'
import { decodeThmlTitle } from '@/lib/watson/ccelWatsonHtml'
import { RYLE_HOLINESS_SLUG, ryleHolinessProfileTitle } from '@/lib/ryleHoliness/ryleHolinessSlug'

export const CCEL_RYLE_HOLINESS_XML_URL = 'https://www.ccel.org/ccel/ryle/holiness.xml'

export interface ParsedRyleHoliness {
  slug: typeof RYLE_HOLINESS_SLUG
  title: string
  gospelSection: GospelSection
  passageKeys: string[]
}

function attrFromTag(tag: string, name: string): string | null {
  const re = new RegExp(`\\b${name}="([^"]*)"`, 'i')
  return re.exec(tag)?.[1]?.trim() ?? null
}

function extractDiv2Blocks(parentInner: string): { openTag: string; inner: string }[] {
  const blocks: { openTag: string; inner: string }[] = []
  const lower = parentInner
  let pos = 0
  while (pos < lower.length) {
    const start = lower.indexOf('<div2', pos)
    if (start === -1) break
    const tagEnd = lower.indexOf('>', start)
    if (tagEnd === -1) break
    const openTag = parentInner.slice(start, tagEnd + 1)
    let depth = 1
    let i = tagEnd + 1
    while (i < lower.length) {
      if (lower.slice(i, i + 5).toLowerCase() === '<div2') {
        const gt = lower.indexOf('>', i)
        if (gt === -1) break
        depth++
        i = gt + 1
        continue
      }
      if (lower.slice(i, i + 7).toLowerCase() === '</div2>') {
        depth--
        i += 7
        if (depth === 0) {
          blocks.push({ openTag, inner: parentInner.slice(tagEnd + 1, i - 7) })
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

function div1InnerFromBlock(block: string): string {
  const innerMatch = block.match(/<div1\b[^>]*>([\s\S]*)<\/div1>\s*$/i)
  return innerMatch
    ? innerMatch[1]
    : block.replace(/^<div1\b[^>]*>/i, '').replace(/<\/div1>\s*$/i, '')
}

function shouldSkipDiv1Title(title: string): boolean {
  const t = title.trim()
  return /^title page$/i.test(t) || /^indexes$/i.test(t)
}

function shouldSkipDiv2Title(title: string): boolean {
  return /^contents$/i.test(title.trim())
}

function isPrefatoryDiv1Title(title: string): boolean {
  return /^prefatory material$/i.test(title.trim())
}

function isHolinessBodyDiv1Title(title: string): boolean {
  return /^holiness$/i.test(title.trim())
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
export function ryleHolinessInnerToSubsectionHtml(inner: string): string {
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

function subsectionFromInner(title: string, inner: string): Subsection | null {
  const content = ryleHolinessInnerToSubsectionHtml(inner)
  if (!content.trim()) return null
  return {
    title,
    content,
    questions: [],
  }
}

function pushDiv2Subsections(
  divInner: string,
  subsections: Subsection[],
  allPassages: string[]
): void {
  for (const { openTag, inner } of extractDiv2Blocks(divInner)) {
    const rawTitle = attrFromTag(openTag, 'title')?.trim() ?? ''
    if (!rawTitle || shouldSkipDiv2Title(rawTitle)) continue
    const title = decodeThmlTitle(rawTitle)
    const sub = subsectionFromInner(title, inner)
    if (!sub) continue
    subsections.push(sub)
    allPassages.push(...passageRefsFromInner(inner))
  }
}

export function parseCcelRyleHolinessXml(xml: string): ParsedRyleHoliness {
  const subsections: Subsection[] = []
  const allPassages: string[] = []

  for (const block of extractDiv1Blocks(xml)) {
    const openMatch = block.match(/^<div1\b([^>]*)>/i)
    if (!openMatch) continue
    const openTag = `<div1${openMatch[1]}>`
    const rawTitle = attrFromTag(openTag, 'title')?.trim() ?? ''
    if (!rawTitle || shouldSkipDiv1Title(rawTitle)) continue

    const divInner = div1InnerFromBlock(block)
    if (isPrefatoryDiv1Title(rawTitle) || isHolinessBodyDiv1Title(rawTitle)) {
      pushDiv2Subsections(divInner, subsections, allPassages)
    }
  }

  if (subsections.length === 0) {
    throw new Error('No Ryle Holiness div2 blocks found in holiness ThML')
  }

  const title = ryleHolinessProfileTitle()
  const gospelSection: GospelSection = {
    section: RYLE_HOLINESS_SLUG,
    title,
    subsections,
  }

  const gospelData: GospelPresentationData = [gospelSection]
  const fromHtml = passageKeysFromRefs(allPassages)
  const fromStored = passageKeysFromGospelPresentationData(gospelData)
  const passageKeys = [...new Set([...fromHtml, ...fromStored])].sort((a, b) => a.localeCompare(b))

  return {
    slug: RYLE_HOLINESS_SLUG,
    title,
    gospelSection,
    passageKeys,
  }
}
