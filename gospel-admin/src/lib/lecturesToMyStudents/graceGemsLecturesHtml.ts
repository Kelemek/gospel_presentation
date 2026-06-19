/**
 * Parse Grace Gems HTML for Spurgeon *Lectures to My Students* (First Series) into source JSON shape.
 */
import { TextDecoder } from 'node:util'
import { GRACE_GEMS_LTMS_SOURCE_URL } from '@/lib/lecturesToMyStudents/graceGemsSourceAttribution'

export const GRACE_GEMS_LTMS_HTML_URL = GRACE_GEMS_LTMS_SOURCE_URL

/** Windows-1252 bytes 0x80–0x9F that TextDecoder does not map to standard Unicode. */
const WIN1252_SPECIAL: Record<number, string> = {
  0x80: '\u20ac',
  0x82: '\u201a',
  0x83: '\u0192',
  0x84: '\u201e',
  0x85: '\u2026',
  0x86: '\u2020',
  0x87: '\u2021',
  0x88: '\u02c6',
  0x89: '\u2030',
  0x8a: '\u0160',
  0x8b: '\u2039',
  0x8c: '\u0152',
  0x8e: '\u017d',
  0x91: '\u2018',
  0x92: '\u2019',
  0x93: '\u201c',
  0x94: '\u201d',
  0x95: '\u2022',
  0x96: '\u2013',
  0x97: '\u2014',
  0x98: '\u02dc',
  0x99: '\u2122',
  0x9a: '\u0161',
  0x9b: '\u203a',
  0x9c: '\u0153',
  0x9e: '\u017e',
  0x9f: '\u0178',
}

export function normalizeWindows1252SpecialChars(text: string): string {
  return text.replace(/[\u0080-\u009f]/g, (ch) => {
    const mapped = WIN1252_SPECIAL[ch.charCodeAt(0)]
    return mapped ?? ch
  })
}

/** Decode Grace Gems lecture HTML bytes (page declares `charset=windows-1252`). */
export function decodeGraceGemsLecturesHtmlBytes(buf: ArrayBuffer | Buffer): string {
  const bytes = buf instanceof Buffer ? new Uint8Array(buf) : new Uint8Array(buf)
  const head = new TextDecoder('latin1').decode(bytes.slice(0, 2048))
  const charsetMatch = head.match(/charset\s*=\s*"?([\w-]+)"?/i)
  const charset = charsetMatch?.[1]?.toLowerCase() === 'utf-8' ? 'utf-8' : 'windows-1252'
  const decoded = new TextDecoder(charset).decode(bytes)
  return charset === 'windows-1252' ? normalizeWindows1252SpecialChars(decoded) : decoded
}

export interface LecturesToMyStudentsChapterSource {
  number: number
  title: string
  paragraphs: string[]
}

export interface LecturesToMyStudentsSourceFile {
  source: string
  sourceUrl: string
  title: string
  introduction: string[]
  chapters: LecturesToMyStudentsChapterSource[]
}

const CHAPTER_HEADING_RE = /^Chapter (\d+)\.\s*(.+?)\s*$/i

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(parseInt(n, 10)))
}

/** Strip tags and normalize whitespace from a Grace Gems paragraph inner HTML fragment. */
export function paragraphInnerToPlain(inner: string): string {
  let s = inner
  s = s.replace(/<br\s*\/?>/gi, ' ')
  s = s.replace(/<[^>]+>/g, ' ')
  s = decodeHtmlEntities(s)
  s = s.replace(/\u00a0/g, ' ')
  s = s.replace(/\s+/g, ' ').trim()
  return s
}

/** Extract non-empty `<p>` bodies from Grace Gems lecture HTML. */
export function extractParagraphsFromGraceGemsHtml(html: string): string[] {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
  const body = bodyMatch ? bodyMatch[1] : html
  const paras: string[] = []
  const re = /<p\b[^>]*>([\s\S]*?)<\/p>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(body)) !== null) {
    const plain = paragraphInnerToPlain(m[1])
    if (plain) paras.push(plain)
  }
  return paras
}

function shouldSkipBeforeIntro(para: string): boolean {
  if (/^Lectures to My Students$/i.test(para)) return true
  if (/^Charles Spurgeon/i.test(para)) return true
  if (/^Lectures to My Students:\s*A Selection/i.test(para)) return true
  return false
}

export function parseGraceGemsLecturesHtml(
  html: string,
  options?: { expectedChapterCount?: number }
): LecturesToMyStudentsSourceFile {
  const paragraphs = extractParagraphsFromGraceGemsHtml(html)
  const introduction: string[] = []
  const chapters: LecturesToMyStudentsChapterSource[] = []
  let mode: 'skip' | 'intro' | 'chapter' = 'skip'
  let currentChapter: LecturesToMyStudentsChapterSource | null = null

  for (const para of paragraphs) {
    const chapterMatch = CHAPTER_HEADING_RE.exec(para)
    if (chapterMatch) {
      if (currentChapter) chapters.push(currentChapter)
      currentChapter = {
        number: parseInt(chapterMatch[1], 10),
        title: chapterMatch[2].trim(),
        paragraphs: [],
      }
      mode = 'chapter'
      continue
    }

    if (mode === 'skip') {
      if (/^INTRODUCTION AND APOLOGY\.?$/i.test(para)) {
        mode = 'intro'
        continue
      }
      if (shouldSkipBeforeIntro(para)) continue
      continue
    }

    if (mode === 'intro') {
      introduction.push(para)
      continue
    }

    if (mode === 'chapter' && currentChapter) {
      currentChapter.paragraphs.push(para)
    }
  }

  if (currentChapter) chapters.push(currentChapter)

  const expected = options?.expectedChapterCount ?? 24
  if (chapters.length !== expected) {
    throw new Error(`Expected ${expected} chapters, found ${chapters.length}`)
  }

  return {
    source: 'Grace Gems',
    sourceUrl: GRACE_GEMS_LTMS_HTML_URL,
    title: 'Lectures to My Students',
    introduction,
    chapters,
  }
}
