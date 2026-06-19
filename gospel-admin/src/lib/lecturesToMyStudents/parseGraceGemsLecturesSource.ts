/**
 * Parse committed Grace Gems source JSON into gospel profile data.
 */
import {
  formatCalvinParagraphBody,
  formatCalvinSubsectionHtml,
} from '@/lib/calvin/calvinHtmlFormatting'
import { finalizeGospelDataForImport } from '@/lib/finalizeGospelDataForImport'
import { graceGemsLtmsAttributionHtml } from '@/lib/lecturesToMyStudents/graceGemsSourceAttribution'
import type { LecturesToMyStudentsChapterSource, LecturesToMyStudentsSourceFile } from '@/lib/lecturesToMyStudents/graceGemsLecturesHtml'
import { isLecturesToMyStudentsOutlineHeading } from '@/lib/lecturesToMyStudents/lecturesToMyStudentsOutline'
import {
  LECTURES_TO_MY_STUDENTS_SLUG,
  lecturesToMyStudentsProfileTitle,
} from '@/lib/lecturesToMyStudents/lecturesToMyStudentsSlug'
import { passageKeysFromRefs } from '@/lib/spurgeon/ccelSermonHtml'
import { passageKeysFromGospelPresentationData } from '@/lib/spurgeon/passageKeysFromGospelData'
import type { GospelPresentationData, GospelSection, Subsection } from '@/lib/types'

export type { LecturesToMyStudentsChapterSource, LecturesToMyStudentsSourceFile }

export interface ParsedLecturesToMyStudents {
  slug: typeof LECTURES_TO_MY_STUDENTS_SLUG
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

function paragraphBodyForStorage(para: string): string {
  const escaped = escapeHtml(para)
  if (isLecturesToMyStudentsOutlineHeading(para)) {
    return `<strong>${escaped}</strong>`
  }
  return escaped
}

function paragraphsToHtml(paragraphs: string[]): string {
  const parts: string[] = []
  let prevBody: string | null = null
  for (const para of paragraphs) {
    const body = paragraphBodyForStorage(para)
    const formatted = formatCalvinParagraphBody(body, prevBody)
    parts.push(`<p>${formatted}</p>`)
    prevBody = body
  }
  return formatCalvinSubsectionHtml(parts.join(''))
}

/** One subsection per chapter; numbered outline points stay in body (bold), not nested TOC entries. */
export function buildLecturesToMyStudentsChapterSubsection(ch: LecturesToMyStudentsChapterSource): Subsection {
  return {
    title: `Chapter ${ch.number}: ${ch.title}`,
    content: paragraphsToHtml(ch.paragraphs),
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

export function parseGraceGemsLecturesSource(data: LecturesToMyStudentsSourceFile): ParsedLecturesToMyStudents {
  const subsections: Subsection[] = []

  subsections.push({
    title: 'Introduction and Apology',
    content: `${paragraphsToHtml(data.introduction)}${graceGemsLtmsAttributionHtml()}`,
    questions: [],
  })

  for (const ch of data.chapters) {
    subsections.push(buildLecturesToMyStudentsChapterSubsection(ch))
  }

  const gospelSection: GospelSection = {
    section: LECTURES_TO_MY_STUDENTS_SLUG,
    title: lecturesToMyStudentsProfileTitle(),
    subsections,
  }

  const gospelData: GospelPresentationData = [gospelSection]
  const fromChapters = data.chapters.flatMap((ch) => refsFromParagraphs(ch.paragraphs))
  const fromIntro = refsFromParagraphs(data.introduction)
  const fromHtml = passageKeysFromRefs([...fromIntro, ...fromChapters])
  const fromStored = passageKeysFromGospelPresentationData(gospelData)
  const passageKeys = [...new Set([...fromHtml, ...fromStored])].sort((a, b) => a.localeCompare(b))

  return {
    slug: LECTURES_TO_MY_STUDENTS_SLUG,
    title: lecturesToMyStudentsProfileTitle(),
    gospelSection,
    passageKeys,
  }
}

/** Parse JSON file content and run finalize (for tests). */
export function parseGraceGemsLecturesJson(json: string): ParsedLecturesToMyStudents & {
  finalized: ReturnType<typeof finalizeGospelDataForImport>
} {
  const data = JSON.parse(json) as LecturesToMyStudentsSourceFile
  const parsed = parseGraceGemsLecturesSource(data)
  const finalized = finalizeGospelDataForImport([parsed.gospelSection], {
    additionalPassageKeys: parsed.passageKeys,
  })
  return { ...parsed, finalized }
}
