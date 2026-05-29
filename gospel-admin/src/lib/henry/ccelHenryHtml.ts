/**
 * Parse CCEL Matthew Henry complete commentary ThML (`mhc1`–`mhc6`) into gospel subsections per book.
 */
import type { GospelSection, Subsection } from '@/lib/types'
import { bookNameToUsfm } from '@/lib/api-bible-passage-id'
import { normalizeCalvinBookUsfm } from '@/lib/calvin/calvinUsfmNormalize'
import type { HenryCcelVolume } from '@/lib/henry/henryCcelManifest'
import { henryProfileTitleForUsfm, henrySlugForUsfm } from '@/lib/henry/henrySlug'
import { bookChapterFromCommentarySubsectionTitle } from '@/lib/studyCommentaryChapterTitleMatch'
import {
  extractDiv1Blocks,
  passageDisplaysFromFragment,
  passageKeysFromRefs,
  unwrapScripRefTags,
} from '@/lib/spurgeon/ccelSermonHtml'

const SKIP_DIV1_TITLE_RE = /^(title page|indexes)$/i
const SKIP_DIV1_PREFIX_RE = /^preface/i

const ROMAN_DIGIT_VALUES: Record<string, number> = {
  I: 1,
  V: 5,
  X: 10,
  L: 50,
  C: 100,
  D: 500,
  M: 1000,
}

export interface ParsedHenryBookChunk {
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

/** Parse a Roman numeral token (e.g. `LI` → 51, `CL` → 150). Returns null if not Roman/digits. */
export function romanNumeralToArabic(token: string): number | null {
  const key = token.trim().toUpperCase().replace(/\./g, '')
  if (!key) return null
  if (/^\d+$/.test(key)) return parseInt(key, 10)
  if (!/^[IVXLCDM]+$/.test(key)) return null

  let sum = 0
  for (let i = 0; i < key.length; i++) {
    const curr = ROMAN_DIGIT_VALUES[key[i]]
    const next = ROMAN_DIGIT_VALUES[key[i + 1]]
    if (curr == null) return null
    sum += next != null && curr < next ? -curr : curr
  }
  return sum > 0 ? sum : null
}

/** Normalize `Chapter I` / `Chapter 1` for subsection titles. */
export function normalizeHenryChapterTitle(title: string): string {
  const m = /^Chapter\s+(.+)$/i.exec(title.trim())
  if (!m) return title.trim()
  const tail = m[1].trim()
  const num = romanNumeralToArabic(tail)
  return num != null ? `Chapter ${num}` : `Chapter ${tail}`
}

function bookUsfmFromDiv1Title(title: string): string | null {
  const t = title.trim()
  if (!t || SKIP_DIV1_TITLE_RE.test(t) || SKIP_DIV1_PREFIX_RE.test(t)) return null
  const raw = bookNameToUsfm(t)
  return raw ? normalizeCalvinBookUsfm(raw) ?? raw : null
}

function shouldSkipDiv1(title: string): boolean {
  const t = title.trim()
  return SKIP_DIV1_TITLE_RE.test(t) || SKIP_DIV1_PREFIX_RE.test(t)
}

function paragraphHtmlFromInner(inner: string): string {
  const parts: string[] = []
  const re = /<p\b[^>]*>([\s\S]*?)<\/p>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(inner)) !== null) {
    const raw = unwrapScripRefTags(m[1]).trim()
    if (!raw) continue
    parts.push(`<p>${raw}</p>`)
  }
  if (parts.length === 0) {
    const plain = unwrapScripRefTags(inner).trim()
    if (plain) return `<p>${plain}</p>`
    return ''
  }
  return parts.join('')
}

/** Subsection title for one CCEL `div2` unit (`Chapter …` in XML). Psalms use `Psalm N`, not `Chapter N`. */
export function henrySubsectionTitleForUnit(bookUsfm: string, chapterTitle: string): string {
  const canonical = normalizeCalvinBookUsfm(bookUsfm) ?? bookUsfm
  const normalized = normalizeHenryChapterTitle(chapterTitle)
  const chapterNumMatch = /^Chapter\s+(\d+)$/i.exec(normalized)
  if (canonical === 'PSA' && chapterNumMatch) {
    return `Psalm ${chapterNumMatch[1]}`
  }
  const bookName = henryProfileTitleForUsfm(canonical).replace(/^Matthew Henry on /, '')
  return `${bookName} — ${normalized}`
}

/** Chapter-level display ref for passage index (e.g. `Genesis 8` → `GEN.8`). */
export function chapterPassageDisplayFromSubsectionTitle(title: string): string | null {
  const fromTitle = bookChapterFromCommentarySubsectionTitle(title)
  if (!fromTitle) return null
  const bookName = henryProfileTitleForUsfm(fromTitle.usfm).replace(/^Matthew Henry on /, '')
  return `${bookName} ${fromTitle.chapter}`
}

function passageDisplaysForHenryChunk(subsections: Subsection[], fragmentPassages: string[]): string[] {
  const chapterDisplays = subsections
    .map((sub) => chapterPassageDisplayFromSubsectionTitle(sub.title))
    .filter((d): d is string => d != null)
  return [...fragmentPassages, ...chapterDisplays]
}

/**
 * Parse one CCEL Matthew Henry volume XML into chunks keyed by canonical USFM book code.
 */
export function parseCcelHenryVolume(xml: string, volume: HenryCcelVolume): ParsedHenryBookChunk[] {
  const volumeBooks = new Set(volume.books.map((b) => normalizeCalvinBookUsfm(b) ?? b))
  const byBook = new Map<string, { subsections: Subsection[]; passages: string[] }>()

  for (const block of extractDiv1Blocks(xml)) {
    const openEnd = block.indexOf('>')
    if (openEnd === -1) continue
    const openTag = block.slice(0, openEnd + 1)
    const div1Title = attrFromTag(openTag, 'title') ?? ''
    if (shouldSkipDiv1(div1Title)) continue

    const bookUsfm = bookUsfmFromDiv1Title(div1Title)
    if (!bookUsfm || !volumeBooks.has(bookUsfm)) continue

    const inner =
      block.match(/<div1\b[^>]*>([\s\S]*)<\/div1>\s*$/i)?.[1] ??
      block.slice(openEnd + 1).replace(/<\/div1>\s*$/i, '')

    const entry = byBook.get(bookUsfm) ?? { subsections: [], passages: [] }

    for (const { openTag: div2Tag, inner: div2Inner } of extractDiv2Blocks(inner)) {
      const chapterTitle = attrFromTag(div2Tag, 'title') ?? ''
      if (!/^Chapter\b/i.test(chapterTitle)) continue

      const content = paragraphHtmlFromInner(div2Inner)
      if (!content.trim()) continue

      entry.subsections.push({
        title: henrySubsectionTitleForUnit(bookUsfm, chapterTitle),
        content,
      })
      entry.passages.push(...passageDisplaysFromFragment(div2Inner))
    }

    byBook.set(bookUsfm, entry)
  }

  const chunks: ParsedHenryBookChunk[] = []
  for (const [rawBook, { subsections, passages }] of byBook) {
    const bookUsfm = normalizeCalvinBookUsfm(rawBook) ?? rawBook
    const passageKeys = passageKeysFromRefs(passageDisplaysForHenryChunk(subsections, passages))
    chunks.push({ bookUsfm, subsections, passageKeys })
  }
  return chunks
}

export function gospelSectionForHenryBook(bookUsfm: string, subsections: Subsection[]): GospelSection {
  const slug = henrySlugForUsfm(bookUsfm)
  return {
    section: slug,
    title: henryProfileTitleForUsfm(bookUsfm),
    subsections,
  }
}
