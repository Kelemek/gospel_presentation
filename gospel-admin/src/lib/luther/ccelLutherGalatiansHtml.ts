/**
 * Parse CCEL ThML `luther/galatians.xml` into one gospel profile (six chapter subsections).
 */
import type { GospelPresentationData, GospelSection, Subsection } from '@/lib/types'
import {
  formatCalvinParagraphBody,
  formatCalvinSubsectionHtml,
} from '@/lib/calvin/calvinHtmlFormatting'
import {
  extractDiv1Blocks,
  extractPassageAttributes,
  normalizedPassageDisplayForInline,
  passageKeysFromRefs,
  unwrapScripRefTags,
} from '@/lib/spurgeon/ccelSermonHtml'
import { passageKeysFromGospelPresentationData } from '@/lib/spurgeon/passageKeysFromGospelData'
import { LUTHER_GALATIANS_SLUG, lutherGalatiansProfileTitle } from '@/lib/luther/lutherSlug'

export const CCEL_LUTHER_GALATIANS_XML_URL =
  'https://www.ccel.org/ccel/luther/galatians.xml'

export interface ParsedLutherGalatians {
  slug: typeof LUTHER_GALATIANS_SLUG
  title: string
  gospelSection: GospelSection
  passageKeys: string[]
}

function attrFromTag(tag: string, name: string): string | null {
  const re = new RegExp(`\\b${name}="([^"]*)"`, 'i')
  return re.exec(tag)?.[1]?.trim() ?? null
}

function isChapterDiv1(openTag: string): boolean {
  return (attrFromTag(openTag, 'type') ?? '').toLowerCase() === 'chapter'
}

/** Strip ThML chrome that should not appear in stored subsection HTML. */
function sanitizeChapterInner(inner: string): string {
  let s = inner
  s = s.replace(/<scripCom\b[^>]*\/?>/gi, '')
  s = s.replace(/<pb\b[^>]*\/?>/gi, '')
  s = s.replace(/<sync\b[^>]*\/?>/gi, '')
  s = s.replace(/<a\b[^>]*\/>/gi, '')
  s = s.replace(/<h3\b[^>]*>[\s\S]*?<\/h3>/gi, '')
  return s
}

/** Convert chapter inner ThML to subsection HTML (`<p>` blocks, inline scripture). */
export function chapterInnerToSubsectionHtml(inner: string): string {
  const s = sanitizeChapterInner(inner)
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

function passageRefsFromChapterInner(inner: string): string[] {
  return extractPassageAttributes(inner).map((r) => normalizedPassageDisplayForInline(r))
}

function subsectionFromChapterDiv1(block: string): Subsection | null {
  const openMatch = block.match(/^<div1\b([^>]*)>/i)
  if (!openMatch) return null
  const openTag = `<div1${openMatch[1]}>`
  if (!isChapterDiv1(openTag)) return null

  const title = attrFromTag(openTag, 'title')?.trim() || 'Galatians'
  const innerMatch = block.match(/<div1\b[^>]*>([\s\S]*)<\/div1>\s*$/i)
  const divInner = innerMatch
    ? innerMatch[1]
    : block.replace(/^<div1\b[^>]*>/i, '').replace(/<\/div1>\s*$/i, '')

  const content = chapterInnerToSubsectionHtml(divInner)
  if (!content.trim()) return null

  return {
    title,
    content,
    questions: [],
  }
}

export function parseCcelLutherGalatiansXml(xml: string): ParsedLutherGalatians {
  const subsections: Subsection[] = []
  const allPassages: string[] = []

  for (const block of extractDiv1Blocks(xml)) {
    const sub = subsectionFromChapterDiv1(block)
    if (!sub) continue
    subsections.push(sub)
    const innerMatch = block.match(/<div1\b[^>]*>([\s\S]*)<\/div1>\s*$/i)
    const divInner = innerMatch
      ? innerMatch[1]
      : block.replace(/^<div1\b[^>]*>/i, '').replace(/<\/div1>\s*$/i, '')
    allPassages.push(...passageRefsFromChapterInner(divInner))
  }

  if (subsections.length === 0) {
    throw new Error('No Galatians chapter div1 blocks found in Luther ThML')
  }

  const title = lutherGalatiansProfileTitle()
  const gospelSection: GospelSection = {
    section: LUTHER_GALATIANS_SLUG,
    title,
    subsections,
  }

  const gospelData: GospelPresentationData = [gospelSection]
  const fromHtml = passageKeysFromRefs(allPassages)
  const fromStored = passageKeysFromGospelPresentationData(gospelData)
  const passageKeys = [...new Set([...fromHtml, ...fromStored])].sort((a, b) => a.localeCompare(b))

  return {
    slug: LUTHER_GALATIANS_SLUG,
    title,
    gospelSection,
    passageKeys,
  }
}
