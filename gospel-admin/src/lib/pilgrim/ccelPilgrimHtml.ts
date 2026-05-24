/**
 * Parse CCEL ThML `bunyan/pilgrim.xml` into one gospel profile (apology + Part I/II stages).
 */
import { bookNameToUsfm } from '@/lib/api-bible-passage-id'
import {
  formatCalvinParagraphBody,
  formatCalvinSubsectionHtml,
} from '@/lib/calvin/calvinHtmlFormatting'
import { GOSPEL_BIBLE_BOOK_NAMES } from '@/lib/gospelBibleBookNames'
import type { GospelPresentationData, GospelSection, Subsection } from '@/lib/types'
import {
  extractDiv1Blocks,
  extractPassageAttributes,
  normalizedPassageDisplayForInline,
  passageKeysFromRefs,
  unwrapScripRefTags,
} from '@/lib/spurgeon/ccelSermonHtml'
import { passageKeysFromGospelPresentationData } from '@/lib/spurgeon/passageKeysFromGospelData'
import { PILGRIM_PROGRESS_SLUG, pilgrimProgressProfileTitle } from '@/lib/pilgrim/pilgrimSlug'

export const CCEL_PILGRIM_XML_URL = 'https://www.ccel.org/ccel/bunyan/pilgrim.xml'

export interface ParsedPilgrimProgress {
  slug: typeof PILGRIM_PROGRESS_SLUG
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
  if (/^title page$/i.test(t)) return true
  if (/^contents$/i.test(t)) return true
  if (/^indexes$/i.test(t)) return true
  return false
}

function isPartDiv1Title(title: string): boolean {
  return /^PART\s+[IVXLC]+$/i.test(title.trim())
}

function isApologyDiv1Title(title: string): boolean {
  return /apology/i.test(title) && /book/i.test(title)
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
export function pilgrimInnerToSubsectionHtml(inner: string): string {
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

function gospelDisplayBookForUsfm(usfm: string): string {
  const code = usfm.toUpperCase()
  for (const name of GOSPEL_BIBLE_BOOK_NAMES) {
    if (bookNameToUsfm(name) === code) return name
  }
  return code
}

/** Convert CCEL `osisRef` (e.g. `Bible:Isa.64.6`) to a canonical display reference for indexing. */
function osisRefToDisplayPassage(osisRef: string): string | null {
  const trimmed = osisRef.trim()
  const range = /^Bible:([A-Za-z0-9]+)\.(\d+)\.(\d+)-Bible:[A-Za-z0-9]+\.(\d+)\.(\d+)$/i.exec(trimmed)
  if (range) {
    const name = gospelDisplayBookForUsfm(range[1])
    return `${name} ${range[2]}:${range[3]}-${range[5]}`
  }
  const single = /^Bible:([A-Za-z0-9]+)\.(\d+)\.(\d+)$/i.exec(trimmed)
  if (single) {
    const name = gospelDisplayBookForUsfm(single[1])
    return `${name} ${single[2]}:${single[3]}`
  }
  return null
}

function passageDisplaysFromFragment(fragment: string): string[] {
  const out: string[] = []
  for (const raw of extractPassageAttributes(fragment)) {
    const n = normalizedPassageDisplayForInline(raw)
    if (n) out.push(n)
  }
  const osisRe = /\bosisRef="([^"]+)"/gi
  let om: RegExpExecArray | null
  while ((om = osisRe.exec(fragment)) !== null) {
    const d = osisRefToDisplayPassage(om[1])
    if (d) out.push(d)
  }
  return out
}

function subsectionFromInner(title: string, inner: string): Subsection | null {
  const content = pilgrimInnerToSubsectionHtml(inner)
  if (!content.trim()) return null
  return { title, content, questions: [] }
}

function pushPartStages(
  partLabel: string,
  partInner: string,
  subsections: Subsection[],
  allPassages: string[]
): void {
  for (const { openTag, inner } of extractDiv2Blocks(partInner)) {
    const stageTitle = attrFromTag(openTag, 'title')?.trim()
    if (!stageTitle) continue
    const title = `${partLabel} — ${stageTitle}`
    const sub = subsectionFromInner(title, inner)
    if (!sub) continue
    subsections.push(sub)
    allPassages.push(...passageDisplaysFromFragment(inner))
  }
}

export function parseCcelPilgrimXml(xml: string): ParsedPilgrimProgress {
  const subsections: Subsection[] = []
  const allPassages: string[] = []

  for (const block of extractDiv1Blocks(xml)) {
    const openMatch = block.match(/^<div1\b([^>]*)>/i)
    if (!openMatch) continue
    const openTag = `<div1${openMatch[1]}>`
    const title = attrFromTag(openTag, 'title')?.trim() ?? ''
    if (!title || shouldSkipDiv1Title(title)) continue

    const divInner = div1InnerFromBlock(block)

    if (isApologyDiv1Title(title)) {
      const sub = subsectionFromInner(title, divInner)
      if (sub) {
        subsections.push(sub)
        allPassages.push(...passageDisplaysFromFragment(divInner))
      }
      continue
    }

    if (isPartDiv1Title(title)) {
      pushPartStages(title, divInner, subsections, allPassages)
    }
  }

  if (subsections.length === 0) {
    throw new Error('No Pilgrim Progress content blocks found in CCEL ThML')
  }

  const profileTitle = pilgrimProgressProfileTitle()
  const gospelSection: GospelSection = {
    section: PILGRIM_PROGRESS_SLUG,
    title: profileTitle,
    subsections,
  }

  const gospelData: GospelPresentationData = [gospelSection]
  const fromHtml = passageKeysFromRefs(allPassages)
  const fromStored = passageKeysFromGospelPresentationData(gospelData)
  const passageKeys = [...new Set([...fromHtml, ...fromStored])].sort((a, b) => a.localeCompare(b))

  return {
    slug: PILGRIM_PROGRESS_SLUG,
    title: profileTitle,
    gospelSection,
    passageKeys,
  }
}
