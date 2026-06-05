/**
 * Shared ThML helpers for CCEL Edwards treatise imports.
 */
import {
  formatCalvinParagraphBody,
  formatCalvinSubsectionHtml,
} from '@/lib/calvin/calvinHtmlFormatting'
import { decodeThmlTitle, normalizeThmlHeadingsForImport } from '@/lib/ccelThmlHeadings'
import type { Subsection } from '@/lib/types'
import {
  extractPassageAttributes,
  normalizedPassageDisplayForInline,
  unwrapScripRefTags,
} from '@/lib/spurgeon/ccelSermonHtml'

export function attrFromTag(tag: string, name: string): string | null {
  const re = new RegExp(`\\b${name}="([^"]*)"`, 'i')
  return re.exec(tag)?.[1]?.trim() ?? null
}

export function div1InnerFromBlock(block: string): string {
  const innerMatch = block.match(/<div1\b[^>]*>([\s\S]*)<\/div1>\s*$/i)
  return innerMatch
    ? innerMatch[1]
    : block.replace(/^<div1\b[^>]*>/i, '').replace(/<\/div1>\s*$/i, '')
}

export function extractDiv2Blocks(parentInner: string): { openTag: string; inner: string }[] {
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

export function shouldSkipEdwardsBookDiv1Title(title: string): boolean {
  const t = title.trim()
  if (/^title page$/i.test(t)) return true
  if (/^indexes$/i.test(t)) return true
  if (/^acknowledgements$/i.test(t)) return true
  return false
}

export function shouldSkipEdwardsBookDiv2Title(title: string): boolean {
  const t = title.trim()
  if (/^title page$/i.test(t)) return true
  if (/^index of scripture references$/i.test(t)) return true
  return false
}

/** Strip ThML chrome that should not appear in stored subsection HTML. */
export function sanitizeEdwardsBookInner(inner: string): string {
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
export function edwardsBookInnerToSubsectionHtml(inner: string): string {
  const s = sanitizeEdwardsBookInner(inner)
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

export function passageRefsFromInner(inner: string): string[] {
  return extractPassageAttributes(inner).map((r) => normalizedPassageDisplayForInline(r))
}

export function subsectionFromInner(title: string, inner: string): Subsection | null {
  const content = edwardsBookInnerToSubsectionHtml(inner)
  if (!content.trim()) return null
  return {
    title,
    content,
    questions: [],
  }
}

export function pushDiv2Subsections(
  divInner: string,
  subsections: Subsection[],
  allPassages: string[]
): void {
  for (const { openTag, inner } of extractDiv2Blocks(divInner)) {
    const rawTitle = attrFromTag(openTag, 'title')?.trim() ?? ''
    if (!rawTitle || shouldSkipEdwardsBookDiv2Title(rawTitle)) continue
    const title = decodeThmlTitle(rawTitle)
    const sub = subsectionFromInner(title, inner)
    if (!sub) continue
    subsections.push(sub)
    allPassages.push(...passageRefsFromInner(inner))
  }
}

/** Part div1 with div2 sections, or one subsection for undivided Part body. */
export function parsePartDiv1Subsections(partInner: string, fallbackTitle: string): Subsection[] {
  const subsections: Subsection[] = []
  const allPassages: string[] = []
  const div2Blocks = extractDiv2Blocks(partInner)

  if (div2Blocks.length === 0) {
    const sub = subsectionFromInner(fallbackTitle, partInner)
    if (sub) {
      subsections.push(sub)
      allPassages.push(...passageRefsFromInner(partInner))
    }
  } else {
    pushDiv2Subsections(partInner, subsections, allPassages)
  }

  if (subsections.length === 0) {
    throw new Error(`No subsections found for Part: ${fallbackTitle}`)
  }

  return subsections
}
