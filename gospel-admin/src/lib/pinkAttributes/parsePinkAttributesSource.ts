/**
 * Parse committed Chapel Library source JSON into gospel profile data.
 */
import {
  formatCalvinParagraphBody,
  formatCalvinSubsectionHtml,
} from '@/lib/calvin/calvinHtmlFormatting'
import { finalizeGospelDataForImport } from '@/lib/finalizeGospelDataForImport'
import {
  PINK_ATTRIBUTES_COPYRIGHT_PAGE_HREF,
} from '@/lib/pinkAttributes/pinkAttributesCopyrightAttribution'
import { isPinkAttributesSubheading } from '@/lib/pinkAttributes/pinkAttributesPdfText'
import {
  PINK_ATTRIBUTES_SLUG,
  pinkAttributesProfileTitle,
} from '@/lib/pinkAttributes/pinkAttributesSlug'
import { passageKeysFromRefs } from '@/lib/spurgeon/ccelSermonHtml'
import { passageKeysFromGospelPresentationData } from '@/lib/spurgeon/passageKeysFromGospelData'
import type { GospelPresentationData, GospelSection, NestedSubsection, Subsection } from '@/lib/types'

export interface PinkAttributesChapterSource {
  number: number
  title: string
  paragraphs: string[]
}

export interface PinkAttributesSourceFile {
  source: string
  sourceUrl?: string
  title: string
  preface: string[]
  chapters: PinkAttributesChapterSource[]
}

export interface ParsedPinkAttributes {
  slug: typeof PINK_ATTRIBUTES_SLUG
  title: string
  gospelSection: GospelSection
  passageKeys: string[]
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function paragraphsToHtml(paragraphs: string[]): string {
  const parts: string[] = []
  let prevBody: string | null = null
  for (const para of paragraphs) {
    const body = escapeHtml(para)
    const formatted = formatCalvinParagraphBody(body, prevBody)
    parts.push(`<p>${formatted}</p>`)
    prevBody = body
  }
  return formatCalvinSubsectionHtml(parts.join(''))
}

/** Split chapter paragraphs at PDF bold section titles into nested subsections. */
export function buildPinkAttributesChapterSubsection(ch: PinkAttributesChapterSource): Subsection {
  const introParagraphs: string[] = []
  const nestedSubsections: NestedSubsection[] = []
  let bucket: string[] = []
  let bucketTitle: string | null = null

  const flushBucket = () => {
    if (bucket.length === 0) return
    if (bucketTitle) {
      nestedSubsections.push({
        title: bucketTitle,
        content: paragraphsToHtml(bucket),
        questions: [],
      })
      bucketTitle = null
    } else {
      introParagraphs.push(...bucket)
    }
    bucket = []
  }

  for (const para of ch.paragraphs) {
    if (isPinkAttributesSubheading(para)) {
      flushBucket()
      bucketTitle = para
      continue
    }
    bucket.push(para)
  }
  flushBucket()

  return {
    title: `Chapter ${ch.number}: ${ch.title}`,
    content: introParagraphs.length > 0 ? paragraphsToHtml(introParagraphs) : '',
    nestedSubsections: nestedSubsections.length > 0 ? nestedSubsections : undefined,
    questions: [],
  }
}

function refsFromParagraphs(paragraphs: string[]): string[] {
  const html = paragraphsToHtml(paragraphs)
  const plain = html.replace(/<[^>]+>/g, ' ')
  const refs: string[] = []
  const parenRe = /\(([1-3]?\s?[A-Za-z]+(?:\s[A-Za-z]+)?\s+\d+:\d+(?:-\d+)?(?:,\s*\d+)?(?:,\s*\d+:\d+)*)\)/g
  let m: RegExpExecArray | null
  while ((m = parenRe.exec(plain)) !== null) {
    refs.push(m[1].replace(/\s+/g, ' ').trim())
  }
  return refs
}

export function parsePinkAttributesSource(data: PinkAttributesSourceFile): ParsedPinkAttributes {
  const subsections: Subsection[] = []

  const prefaceParagraphs = [...data.preface]
  const attributionHtml = `<p>Text from the Chapel Library edition (1993). See <a href="${PINK_ATTRIBUTES_COPYRIGHT_PAGE_HREF}">Copyright &amp; Attribution</a> for the required notice.</p>`

  subsections.push({
    title: 'Preface',
    content: `${paragraphsToHtml(prefaceParagraphs)}${attributionHtml}`,
    questions: [],
  })

  for (const ch of data.chapters) {
    subsections.push(buildPinkAttributesChapterSubsection(ch))
  }

  const gospelSection: GospelSection = {
    section: PINK_ATTRIBUTES_SLUG,
    title: pinkAttributesProfileTitle(),
    subsections,
  }

  const gospelData: GospelPresentationData = [gospelSection]
  const fromChapters = data.chapters.flatMap((ch) => refsFromParagraphs(ch.paragraphs))
  const fromPreface = refsFromParagraphs(data.preface)
  const fromHtml = passageKeysFromRefs([...fromPreface, ...fromChapters])
  const fromStored = passageKeysFromGospelPresentationData(gospelData)
  const passageKeys = [...new Set([...fromHtml, ...fromStored])].sort((a, b) => a.localeCompare(b))

  return {
    slug: PINK_ATTRIBUTES_SLUG,
    title: pinkAttributesProfileTitle(),
    gospelSection,
    passageKeys,
  }
}

/** Parse JSON file content and run finalize (for tests). */
export function parsePinkAttributesJson(json: string): ParsedPinkAttributes & {
  finalized: ReturnType<typeof finalizeGospelDataForImport>
} {
  const data = JSON.parse(json) as PinkAttributesSourceFile
  const parsed = parsePinkAttributesSource(data)
  const finalized = finalizeGospelDataForImport([parsed.gospelSection], {
    additionalPassageKeys: parsed.passageKeys,
  })
  return { ...parsed, finalized }
}
