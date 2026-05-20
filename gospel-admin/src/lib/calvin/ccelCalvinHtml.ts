/**
 * Parse CCEL Calvin commentary ThML (`calcom01`–`calcom45`) into gospel subsections per canonical book.
 */
import type { GospelSection, Subsection } from '@/lib/types'
import { bookNameToUsfm } from '@/lib/api-bible-passage-id'
import { parseReference } from '@/lib/parse-scripture-reference'
import {
  extractPassageAttributes,
  extractDiv1Blocks,
  normalizedPassageDisplayForInline,
  passageKeysFromRefs,
  unwrapScripRefTags,
} from '@/lib/spurgeon/ccelSermonHtml'
import type { CalvinCcelVolume } from '@/lib/calvin/calvinCcelManifest'
import { calvinProfileTitleForUsfm, calvinSlugForUsfm } from '@/lib/calvin/calvinSlug'
import {
  formatCalvinParagraphBody,
  formatCalvinSubsectionHtml,
} from '@/lib/calvin/calvinHtmlFormatting'
import { normalizeCalvinBookUsfm } from '@/lib/calvin/calvinUsfmNormalize'

const MAX_NAV_TITLE_LEN = 72

const SKIP_DIV1_TYPES = new Set(['front', 'back', 'indexes', 'index'])

const COMMENTARY_UNIT_DIV2_TYPES = new Set(['scripture', 'chapter', 'Chapter'])

export interface ParsedCalvinBookChunk {
  bookUsfm: string
  subsections: Subsection[]
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

function bookUsfmFromOsisRef(osisRef: string): string | null {
  const m = /Bible:([A-Za-z0-9]+)\./.exec(osisRef.trim())
  if (!m) return null
  return normalizeCalvinBookUsfm(m[1])
}

function bookUsfmFromPassageText(text: string): string | null {
  const parsed = parseReference(text.replace(/–/g, '-'))
  if (!parsed) return null
  const fromName = bookNameToUsfm(parsed.book)
  return fromName ? normalizeCalvinBookUsfm(fromName) ?? fromName : null
}

function dominantBookUsfmFromFragment(fragment: string): string | null {
  const counts = new Map<string, number>()
  const bump = (code: string | null) => {
    if (!code) return
    counts.set(code, (counts.get(code) ?? 0) + 1)
  }

  const osisRe = /\bosisRef="([^"]+)"/gi
  let om: RegExpExecArray | null
  while ((om = osisRe.exec(fragment)) !== null) {
    bump(bookUsfmFromOsisRef(om[1]))
  }

  for (const p of extractPassageAttributes(fragment)) {
    bump(bookUsfmFromPassageText(normalizedPassageDisplayForInline(p)))
  }

  const titleMatch = fragment.match(/\btitle="([^"]+)"/i)
  if (titleMatch?.[1]) {
    bump(bookUsfmFromPassageText(titleMatch[1]))
  }

  let best: string | null = null
  let bestN = 0
  for (const [code, n] of counts) {
    if (n > bestN) {
      bestN = n
      best = code
    }
  }
  return best
}

/** CCEL `div2 type="scripture"` titles name the passage being expounded (e.g. Luke 1:18-20). */
function bookUsfmFromScriptureDiv2OpenTag(openTag: string): string | null {
  const type = (attrFromTag(openTag, 'type') ?? '').toLowerCase()
  if (type !== 'scripture') return null
  const title = attrFromTag(openTag, 'title') ?? ''
  if (!title.trim()) return null
  return bookUsfmFromPassageText(title)
}

function bookUsfmForCommentaryUnit(
  openTag: string,
  inner: string,
  div1Book: string | null,
  fallbackBook: string | null
): string | null {
  return (
    bookUsfmFromScriptureDiv2OpenTag(openTag) ??
    dominantBookUsfmFromFragment(inner) ??
    div1Book ??
    fallbackBook
  )
}

function bookUsfmFromDiv1Title(title: string): string | null {
  const t = title.trim()
  const m = /^Commentary on\s+(.+)$/i.exec(t)
  if (m?.[1]) {
    const bookPart = m[1].split(',')[0].trim()
    const raw = bookNameToUsfm(bookPart)
    return raw ? normalizeCalvinBookUsfm(raw) ?? raw : null
  }
  if (/^Harmony of the Law/i.test(t)) return null
  if (/^Harmony of the Gospels/i.test(t)) return null
  const raw = bookNameToUsfm(t)
  return raw ? normalizeCalvinBookUsfm(raw) ?? raw : null
}

function isCommentaryDiv1(openTag: string): boolean {
  const type = (attrFromTag(openTag, 'type') ?? '').toLowerCase()
  if (SKIP_DIV1_TYPES.has(type)) return false
  if (type === 'book' || type === 'section') return true
  if (type === 'chapter') return true
  return false
}

function paragraphHtmlFromInner(inner: string): string {
  const parts: string[] = []
  const re = /<p\b[^>]*>([\s\S]*?)<\/p>/gi
  let m: RegExpExecArray | null
  let prevBody: string | null = null
  while ((m = re.exec(inner)) !== null) {
    const raw = unwrapScripRefTags(m[1]).trim()
    if (!raw) continue
    const body = formatCalvinParagraphBody(raw, prevBody)
    parts.push(`<p>${body}</p>`)
    prevBody = raw
  }
  if (parts.length === 0) {
    const plain = unwrapScripRefTags(inner).trim()
    if (plain) return `<p>${formatCalvinParagraphBody(plain, null)}</p>`
    return ''
  }
  return formatCalvinSubsectionHtml(parts.join(''))
}

function subsectionTitleFromUnit(
  div2Tag: string,
  bookUsfm: string,
  parentChapterTitle: string | null
): string {
  const type = attrFromTag(div2Tag, 'type') ?? ''
  const title = attrFromTag(div2Tag, 'title') ?? ''
  if (type.toLowerCase() === 'scripture' && title) return title
  if (COMMENTARY_UNIT_DIV2_TYPES.has(type) && title) {
    const bookName = calvinProfileTitleForUsfm(bookUsfm).replace(/^Calvin on /, '')
    if (parentChapterTitle) return `${bookName} — ${parentChapterTitle} — ${title}`
    return `${bookName} — ${title}`
  }
  const plain = title || `Section`
  if (plain.length <= MAX_NAV_TITLE_LEN) return plain
  return `${plain.slice(0, MAX_NAV_TITLE_LEN - 1)}…`
}

function unitsFromDiv1Inner(
  div1OpenTag: string,
  div1Inner: string,
  fallbackBook: string | null
): { bookUsfm: string; title: string; inner: string }[] {
  const div1Title = attrFromTag(div1OpenTag, 'title') ?? ''
  const div1Book = bookUsfmFromDiv1Title(div1Title) ?? fallbackBook
  const div1Type = (attrFromTag(div1OpenTag, 'type') ?? '').toLowerCase()

  const out: { bookUsfm: string; title: string; inner: string }[] = []

  if (div1IsMultiBookBook(div1OpenTag)) {
    const chapterBlocks = extractDiv2Blocks(div1Inner)
    const book = div1Book ?? dominantBookUsfmFromFragment(div1Inner)
    if (!book) return out
    for (const { openTag, inner } of chapterBlocks) {
      const type = attrFromTag(openTag, 'type') ?? ''
      if (!COMMENTARY_UNIT_DIV2_TYPES.has(type)) continue
      const scriptureChildren = extractDiv2Blocks(inner)
      if (scriptureChildren.some((c) => (attrFromTag(c.openTag, 'type') ?? '').toLowerCase() === 'scripture')) {
        for (const child of scriptureChildren) {
          if ((attrFromTag(child.openTag, 'type') ?? '').toLowerCase() !== 'scripture') continue
          const routed = bookUsfmForCommentaryUnit(child.openTag, child.inner, book, null)
          if (!routed) continue
          out.push({
            bookUsfm: routed,
            title: subsectionTitleFromUnit(child.openTag, routed, attrFromTag(openTag, 'title')),
            inner: child.inner,
          })
        }
      } else {
        out.push({
          bookUsfm: book,
          title: subsectionTitleFromUnit(openTag, book, null),
          inner,
        })
      }
    }
    return out
  }

  const scriptureDiv2s = extractDiv2Blocks(div1Inner).filter((b) => {
    const t = (attrFromTag(b.openTag, 'type') ?? '').toLowerCase()
    return t === 'scripture'
  })

  if (scriptureDiv2s.length > 0) {
    for (const { openTag, inner } of scriptureDiv2s) {
      const routed = bookUsfmForCommentaryUnit(openTag, inner, div1Book, fallbackBook)
      if (!routed) continue
      out.push({
        bookUsfm: routed,
        title: subsectionTitleFromUnit(openTag, routed, null),
        inner,
      })
    }
    return out
  }

  if (div1IsChapterDiv1(div1Type)) {
    const chapterTitle = div1Title || 'Chapter'
    const blocks = extractDiv2Blocks(div1Inner)
    if (blocks.length > 0) {
      for (const { openTag, inner } of blocks) {
        const type = attrFromTag(openTag, 'type') ?? ''
        if (!COMMENTARY_UNIT_DIV2_TYPES.has(type) && type.toLowerCase() !== 'scripture') continue
        const routed = bookUsfmForCommentaryUnit(openTag, inner, div1Book, fallbackBook)
        if (!routed) continue
        out.push({
          bookUsfm: routed,
          title: subsectionTitleFromUnit(openTag, routed, chapterTitle),
          inner,
        })
      }
    } else {
      const routed = dominantBookUsfmFromFragment(div1Inner) ?? div1Book ?? fallbackBook
      if (routed) {
        out.push({ bookUsfm: routed, title: chapterTitle, inner: div1Inner })
      }
    }
    return out
  }

  const routed = div1Book ?? dominantBookUsfmFromFragment(div1Inner) ?? fallbackBook
  if (routed && div1Inner.trim()) {
    out.push({
      bookUsfm: routed,
      title: div1Title || calvinProfileTitleForUsfm(routed),
      inner: div1Inner,
    })
  }
  return out
}

function div1IsMultiBookBook(openTag: string): boolean {
  const type = (attrFromTag(openTag, 'type') ?? '').toLowerCase()
  return type === 'book'
}

function div1IsChapterDiv1(type: string): boolean {
  return type === 'chapter'
}

/**
 * Parse one CCEL Calvin volume XML into chunks keyed by canonical USFM book code.
 */
export function parseCcelCalvinVolume(
  xml: string,
  volume: CalvinCcelVolume
): ParsedCalvinBookChunk[] {
  const byBook = new Map<string, { subsections: Subsection[]; passages: string[] }>()
  const defaultBook = volume.bookUsfm ?? null

  const div1Blocks = extractDiv1Blocks(xml)
  for (const block of div1Blocks) {
    const openEnd = block.indexOf('>')
    if (openEnd === -1) continue
    const openTag = block.slice(0, openEnd + 1)
    if (!isCommentaryDiv1(openTag)) continue
    const inner =
      block.match(/<div1\b[^>]*>([\s\S]*)<\/div1>\s*$/i)?.[1] ??
      block.slice(openEnd + 1).replace(/<\/div1>\s*$/i, '')

    const units = unitsFromDiv1Inner(openTag, inner, defaultBook)
    const lockedBook =
      volume.kind === 'standard' && volume.bookUsfm
        ? normalizeCalvinBookUsfm(volume.bookUsfm) ?? volume.bookUsfm
        : null

    for (const unit of units) {
      let book = unit.bookUsfm ? normalizeCalvinBookUsfm(unit.bookUsfm) ?? unit.bookUsfm : null
      if (!book) continue
      // Single-book volumes (e.g. calcom38 Romans): keep all units on that book even when
      // editor footnotes cite other books more often than the passage being commented on.
      if (lockedBook) {
        book = lockedBook
      } else if (volume.kind === 'harmonyLaw' || volume.kind === 'harmonyGospels') {
        const dominant = dominantBookUsfmFromFragment(unit.inner)
        book = unit.bookUsfm ?? dominant
        if (!book) continue
      }
      const volumeBooks = volume.books?.map((b) => normalizeCalvinBookUsfm(b) ?? b) ?? []
      if (volumeBooks.length > 0 && !volumeBooks.includes(book)) {
        const defaultCanon = defaultBook ? normalizeCalvinBookUsfm(defaultBook) ?? defaultBook : null
        if (!defaultCanon || defaultCanon !== book) {
          const dominant = dominantBookUsfmFromFragment(unit.inner)
          if (dominant && volumeBooks.includes(dominant)) book = dominant
          else if (!volumeBooks.includes(book)) continue
        }
      }

      const content = paragraphHtmlFromInner(unit.inner)
      if (!content.trim()) continue

      const entry = byBook.get(book) ?? { subsections: [], passages: [] }
      entry.subsections.push({
        title: unit.title,
        content,
      })
      entry.passages.push(...extractPassageAttributes(unit.inner))
      byBook.set(book, entry)
    }
  }

  const chunks: ParsedCalvinBookChunk[] = []
  for (const [rawBook, { subsections, passages }] of byBook) {
    const bookUsfm = normalizeCalvinBookUsfm(rawBook) ?? rawBook
    const passageKeys = passageKeysFromRefs(
      passages.map((raw) => normalizedPassageDisplayForInline(raw))
    )
    chunks.push({ bookUsfm, subsections, passageKeys })
  }
  return chunks
}

export function gospelSectionForCalvinBook(
  bookUsfm: string,
  subsections: Subsection[]
): GospelSection {
  const slug = calvinSlugForUsfm(bookUsfm)
  return {
    section: slug,
    title: calvinProfileTitleForUsfm(bookUsfm),
    subsections,
  }
}
