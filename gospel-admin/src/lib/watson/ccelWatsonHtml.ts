/**
 * Parse CCEL ThML Watson volumes into one gospel profile per book.
 */
import {
  formatCalvinParagraphBody,
  formatCalvinSubsectionHtml,
} from '@/lib/calvin/calvinHtmlFormatting'
import type { GospelPresentationData, GospelSection, Subsection } from '@/lib/types'
import {
  extractDiv1Blocks,
  passageDisplaysFromFragment,
  passageKeysFromRefs,
  unwrapScripRefTags,
} from '@/lib/spurgeon/ccelSermonHtml'
import { passageKeysFromGospelPresentationData } from '@/lib/spurgeon/passageKeysFromGospelData'
import type { WatsonCcelBookDef } from '@/lib/watson/watsonCcelManifest'

export interface ParsedWatsonBook {
  slug: string
  title: string
  gospelSection: GospelSection
  passageKeys: string[]
}

function attrFromTag(tag: string, name: string): string | null {
  const re = new RegExp(`\\b${name}="([^"]*)"`, 'i')
  return re.exec(tag)?.[1]?.trim() ?? null
}

export function decodeThmlTitle(title: string): string {
  return title
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

function div1InnerFromBlock(block: string): string {
  const innerMatch = block.match(/<div1\b[^>]*>([\s\S]*)<\/div1>\s*$/i)
  return innerMatch
    ? innerMatch[1]
    : block.replace(/^<div1\b[^>]*>/i, '').replace(/<\/div1>\s*$/i, '')
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

/** Strip ThML chrome that should not appear in stored subsection HTML. */
function sanitizeInner(inner: string): string {
  let s = inner
  s = s.replace(/<scripCom\b[^>]*\/?>/gi, '')
  s = s.replace(/<pb\b[^>]*\/?>/gi, '')
  s = s.replace(/<sync\b[^>]*\/?>/gi, '')
  s = s.replace(/<a\b[^>]*\/>/gi, '')
  s = s.replace(/<h2\b[^>]*>[\s\S]*?<\/h2>/gi, '')
  s = s.replace(/<h3\b[^>]*>[\s\S]*?<\/h3>/gi, '')
  return s
}

/** Convert ThML inner to subsection HTML (`<p>` blocks, inline scripture). */
export function thmlInnerToSubsectionHtml(inner: string): string {
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
  return passageDisplaysFromFragment(inner)
}

function subsectionFromInner(title: string, inner: string): Subsection | null {
  const content = thmlInnerToSubsectionHtml(inner)
  if (!content.trim()) return null
  return { title, content, questions: [] }
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
  allPassages.push(...passageRefsFromInner(inner))
}

function parseDiv1Subsections(
  xml: string,
  book: WatsonCcelBookDef
): { subsections: Subsection[]; allPassages: string[] } {
  const subsections: Subsection[] = []
  const allPassages: string[] = []

  for (const block of extractDiv1Blocks(xml)) {
    const openMatch = block.match(/^<div1\b([^>]*)>/i)
    if (!openMatch) continue
    const openTag = `<div1${openMatch[1]}>`
    const rawTitle = attrFromTag(openTag, 'title')?.trim() ?? ''
    if (!rawTitle || book.shouldSkipDiv1Title(rawTitle)) continue

    const title = decodeThmlTitle(rawTitle)
    pushSubsection(subsections, allPassages, title, div1InnerFromBlock(block))
  }

  if (subsections.length === 0) {
    throw new Error(`No ${book.profileTitle} div1 subsections found in Watson ThML`)
  }

  return { subsections, allPassages }
}

function parseDiv2Subsections(
  xml: string,
  book: WatsonCcelBookDef
): { subsections: Subsection[]; allPassages: string[] } {
  const subsections: Subsection[] = []
  const allPassages: string[] = []

  for (const block of extractDiv1Blocks(xml)) {
    const openMatch = block.match(/^<div1\b([^>]*)>/i)
    if (!openMatch) continue
    const openTag = `<div1${openMatch[1]}>`
    const rawDiv1Title = attrFromTag(openTag, 'title')?.trim() ?? ''
    if (!rawDiv1Title || book.shouldSkipDiv1Title(rawDiv1Title)) continue

    const div1Title = decodeThmlTitle(rawDiv1Title)
    const div1Inner = div1InnerFromBlock(block)
    const div2Blocks = extractDiv2Blocks(div1Inner)

    if (div2Blocks.length === 0) {
      pushSubsection(subsections, allPassages, div1Title, div1Inner)
      continue
    }

    for (const { openTag: div2OpenTag, inner } of div2Blocks) {
      const rawDiv2Title = attrFromTag(div2OpenTag, 'title')?.trim()
      if (!rawDiv2Title) continue
      const div2Title = decodeThmlTitle(rawDiv2Title)
      const title = `${div1Title} — ${div2Title}`
      pushSubsection(subsections, allPassages, title, inner)
    }
  }

  if (subsections.length === 0) {
    throw new Error(`No ${book.profileTitle} div2 subsections found in Watson ThML`)
  }

  return { subsections, allPassages }
}

export function parseCcelWatsonXml(xml: string, book: WatsonCcelBookDef): ParsedWatsonBook {
  const { subsections, allPassages } =
    book.subsectionLevel === 'div2' ? parseDiv2Subsections(xml, book) : parseDiv1Subsections(xml, book)

  const title = book.profileTitle
  const gospelSection: GospelSection = {
    section: book.slug,
    title,
    subsections,
  }

  const gospelData: GospelPresentationData = [gospelSection]
  const fromHtml = passageKeysFromRefs(allPassages)
  const fromStored = passageKeysFromGospelPresentationData(gospelData)
  const passageKeys = [...new Set([...fromHtml, ...fromStored])].sort((a, b) => a.localeCompare(b))

  return {
    slug: book.slug,
    title,
    gospelSection,
    passageKeys,
  }
}
