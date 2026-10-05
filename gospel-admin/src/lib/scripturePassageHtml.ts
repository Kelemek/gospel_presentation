import { bookNameToUsfm } from '@/lib/api-bible-passage-id'
import { SCRIPTURE_HIGHLIGHT_MARK_CLASSES } from '@/lib/scriptureHighlightStyles'
import type { ScriptureHighlightColorId } from '@/lib/scriptureHighlightStyles'
import { normalizeEsvMisconvertedChapterVersePrefix } from '@/lib/esvPassageHtmlToText'
import {
  ensureVerseNumbersOutsideWordsOfChrist,
  SCRIPTURE_WOC_END,
  SCRIPTURE_WOC_START,
  stripScriptureWordsOfChristMarkers,
} from '@/lib/scriptureWordsOfChristMarkup'

const SCRIPTURE_WOC_SPAN_OPEN =
  '<span class="scripture-woc text-red-700 dark:text-red-400">'

const SCRIPTURE_VERSE_NUMBER_CLICKABLE_CLASS =
  'scripture-verse-number cursor-pointer hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded-sm'

/** Opening verse of each Psalm 119 stanza, then the ESV Hebrew letter name. */
const PSALM_119_STANZA_STARTS = [
  [1, 'Aleph'],
  [9, 'Beth'],
  [17, 'Gimel'],
  [25, 'Daleth'],
  [33, 'He'],
  [41, 'Waw'],
  [49, 'Zayin'],
  [57, 'Heth'],
  [65, 'Teth'],
  [73, 'Yodh'],
  [81, 'Kaph'],
  [89, 'Lamedh'],
  [97, 'Mem'],
  [105, 'Nun'],
  [113, 'Samekh'],
  [121, 'Ayin'],
  [129, 'Pe'],
  [137, 'Tsadhe'],
  [145, 'Qoph'],
  [153, 'Resh'],
  [161, 'Sin and Shin'],
  [169, 'Taw'],
] as const

/** Longest first so "Sin and Shin" is matched before a shorter title. */
const PSALM_119_ACROSTIC_HEADINGS = PSALM_119_STANZA_STARTS.map(([, heading]) => heading).sort(
  (a, b) => b.length - a.length
)

const PSALM_119_ACROSTIC_HEADING_SET = new Set<string>(PSALM_119_ACROSTIC_HEADINGS)

const PSALM_119_ACROSTIC_PARAGRAPH_CLASS = 'scripture-psalm-119-acrostic font-semibold'

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Psalm 119 acrostic titles after the first often sit inline before the next verse
 * (e.g. "...heart! He [33]"). Break them onto their own paragraph like Daleth at v25.
 * Whitespace already around the title is consumed so a second pass does not add a blank paragraph.
 */
export function isolatePsalm119AcrosticHeadings(text: string): string {
  let out = text
  for (const heading of PSALM_119_ACROSTIC_HEADINGS) {
    const escaped = escapeRegExp(heading).replace(/ /g, '\\s+')
    const beforeVerse = new RegExp(`(\\S)\\s+(${escaped})\\s*(?=\\[\\d{1,3}\\])`, 'g')
    out = out.replace(beforeVerse, `$1\n\n$2\n\n`)
  }
  return out.replace(/\n\n[ \t]+(?=\[\d{1,3}\])/g, '\n\n')
}

function isPsalm119(book: string | undefined, chapter: number | undefined): boolean {
  if (chapter !== 119 || !book) return false
  return bookNameToUsfm(book) === 'PSA'
}

function acrosticHeadingImmediatelyBefore(prefix: string, heading: string): boolean {
  const escaped = escapeRegExp(heading).replace(/ /g, '\\s+')
  return new RegExp(`(?:^|\\s)${escaped}\\s*$`).test(prefix)
}

/**
 * Insert a Psalm 119 letter name on its own line before each stanza-start verse
 * that is actually in the text. A heading already sitting immediately before that
 * marker is left in place.
 */
export function injectPsalm119AcrosticHeadings(text: string): string {
  const inserts: { index: number; heading: string }[] = []
  for (const [verse, heading] of PSALM_119_STANZA_STARTS) {
    const match = new RegExp(`(?<!\\d)\\[${verse}\\](?!\\d)`).exec(text)
    if (match?.index === undefined) continue
    if (acrosticHeadingImmediatelyBefore(text.slice(0, match.index), heading)) continue
    inserts.push({ index: match.index, heading })
  }

  let out = text
  for (const insert of inserts.sort((a, b) => b.index - a.index)) {
    const prefix = out.slice(0, insert.index)
    const rest = out.slice(insert.index)
    const trimmedEnd = prefix.replace(/\s+$/, '')
    const lead = trimmedEnd.length === 0 ? '' : '\n\n'
    out = `${trimmedEnd}${lead}${insert.heading}\n\n${rest}`
  }
  return out
}

function tagPsalm119AcrosticHeadingParagraphs(html: string): string {
  return html.replace(/<p>([^<]*)<\/p>/g, (full, inner: string) => {
    const trimmed = inner.trim()
    if (!PSALM_119_ACROSTIC_HEADING_SET.has(trimmed)) return full
    return `<p class="${PSALM_119_ACROSTIC_PARAGRAPH_CLASS}">${trimmed}</p>`
  })
}

function prepareScripturePassageText(
  text: string,
  book?: string,
  chapter?: number
): string {
  const withHeadings = isPsalm119(book, chapter) ? injectPsalm119AcrosticHeadings(text) : text
  return ensureVerseNumbersOutsideWordsOfChrist(
    normalizeEsvMisconvertedChapterVersePrefix(isolatePsalm119AcrosticHeadings(withHeadings))
  )
}

function renderScriptureParagraphHtml(
  text: string,
  showVerseNumbers: boolean,
  book: string | undefined,
  chapter: number | undefined,
  clickableVerseNumbers = false
): string {
  const plain = prepareScripturePassageText(text, book, chapter)
  let html = replaceParagraphBreaks(
    replaceVerseMarkers(plain, showVerseNumbers, clickableVerseNumbers)
  )
  if (isPsalm119(book, chapter)) html = tagPsalm119AcrosticHeadingParagraphs(html)
  return html
}

function applyWordsOfChristPlain(text: string, showWordsOfChrist: boolean): string {
  if (!showWordsOfChrist) {
    return stripScriptureWordsOfChristMarkers(text)
  }
  return text
    .replaceAll(SCRIPTURE_WOC_START, SCRIPTURE_WOC_SPAN_OPEN)
    .replaceAll(SCRIPTURE_WOC_END, '</span>')
}

export function verseSupHtml(n: number, showVerseNumbers: boolean, clickable = false): string {
  if (showVerseNumbers) {
    if (clickable) {
      return `<sup class="text-blue-600 font-medium ${SCRIPTURE_VERSE_NUMBER_CLICKABLE_CLASS}" data-scripture-verse="${n}" role="button" tabindex="0">${n}</sup>`
    }
    return `<sup class="text-blue-600 font-medium">${n}</sup>`
  }
  return `<sup class="hidden" aria-hidden="true">${n}</sup>`
}

function replaceVerseMarkers(
  text: string,
  showVerseNumbers: boolean,
  clickableVerseNumbers = false
): string {
  return text.replace(/\[(\d+)\]/g, (_match, n: string) =>
    verseSupHtml(Number(n), showVerseNumbers, clickableVerseNumbers)
  )
}

function replaceParagraphBreaks(text: string): string {
  if (!/\n\n/.test(text)) return text
  return `<p>${text.replace(/\n\n/g, '</p><p>')}</p>`
}

/**
 * Liturgical pause marks (Psalms/Habakkuk Selah; NLT Interlude; Psalm 9:16 Higgaion. Selah).
 * Applied after highlight wrapping so verse-range regexes still see plain text after the last `<sup>`.
 */
const SCRIPTURE_PAUSE_MARK_HTML =
  '<span class="scripture-pause-mark">$1</span><span class="scripture-pause-break" aria-hidden="true"></span>'

export function wrapScriptureSelahHtml(html: string): string {
  return html.replace(
    /\b((?:Higgaion\.?\s+)?(?:Selah|Interlude)\.?)(?=[\s<]|$)/gi,
    SCRIPTURE_PAUSE_MARK_HTML
  )
}

/** Tailwind typography wrapper for scripture HTML (`<p>` blocks from {@link replaceParagraphBreaks}). */
export const SCRIPTURE_READER_PROSE_CLASS =
  'prose max-w-none prose-p:my-0 prose-p:first:mt-0 [&_p+p]:mt-2'

export interface ScripturePassageSavedHighlight {
  id: string
  verseStart: number
  verseEnd: number
  colorId: ScriptureHighlightColorId
}

export interface ScripturePassageSavedHighlightOption {
  id: string
  colorId: ScriptureHighlightColorId
}

function markAttrsForHighlight(id: string, colorId: ScriptureHighlightColorId): string {
  const cls = SCRIPTURE_HIGHLIGHT_MARK_CLASSES[colorId]
  return `data-scripture-highlight-id="${id}" class="${cls}"`
}

function wrapVerseRangeInMark(
  html: string,
  verseStart: number,
  verseEnd: number,
  markAttrs: string
): string {
  const nextVerseAfterSelection = verseEnd + 1
  const markOpen = `<mark ${markAttrs}>`
  const markClose = '</mark>'
  if (verseStart === verseEnd) {
    return html.replace(
      new RegExp(
        `(<sup[^>]*>${verseStart}</sup>[\\s\\S]*?)(?=<sup[^>]*>${nextVerseAfterSelection}</sup>|$)`,
        'g'
      ),
      `${markOpen}$1${markClose}`
    )
  }
  const rangePattern = new RegExp(
    `(<sup[^>]*>${verseStart}</sup>[\\s\\S]*?<sup[^>]*>${verseEnd}</sup>[\\s\\S]*?)(?=<sup[^>]*>${nextVerseAfterSelection}</sup>|$)`,
    'g'
  )
  return html.replace(rangePattern, `${markOpen}$1${markClose}`)
}

function applySavedHighlightMarks(
  html: string,
  saved: readonly ScripturePassageSavedHighlight[]
): string {
  let out = html
  for (const h of saved) {
    out = wrapVerseRangeInMark(
      out,
      h.verseStart,
      h.verseEnd,
      markAttrsForHighlight(h.id, h.colorId)
    )
  }
  return out
}

export function formatScripturePassageHtml(
  text: string,
  options: {
    showVerseNumbers: boolean
    showWordsOfChrist?: boolean
    savedHighlight?: ScripturePassageSavedHighlightOption
    book?: string
    chapter?: number
  }
): string {
  const showWordsOfChrist = options.showWordsOfChrist ?? true
  let html = renderScriptureParagraphHtml(
    text,
    options.showVerseNumbers,
    options.book,
    options.chapter
  )
  if (options.savedHighlight) {
    const attrs = markAttrsForHighlight(options.savedHighlight.id, options.savedHighlight.colorId)
    html = `<mark ${attrs}>${html}</mark>`
  }
  html = applyWordsOfChristPlain(html, showWordsOfChrist)
  return wrapScriptureSelahHtml(html)
}

export function formatScriptureChapterHtml(
  text: string,
  options: {
    showVerseNumbers: boolean
    showWordsOfChrist?: boolean
    highlightVerses: number[]
    savedHighlights?: readonly ScripturePassageSavedHighlight[]
    clickableVerseNumbers?: boolean
    book?: string
    chapter?: number
  }
): string {
  const {
    showVerseNumbers,
    highlightVerses,
    savedHighlights = [],
    clickableVerseNumbers = false,
    book,
    chapter,
  } = options
  const showWordsOfChrist = options.showWordsOfChrist ?? true

  let processedText = renderScriptureParagraphHtml(
    text,
    showVerseNumbers,
    book,
    chapter,
    clickableVerseNumbers
  )

  if (savedHighlights.length > 0) {
    processedText = applySavedHighlightMarks(processedText, savedHighlights)
  }

  if (highlightVerses.length === 0) {
    processedText = applyWordsOfChristPlain(processedText, showWordsOfChrist)
    return wrapScriptureSelahHtml(processedText)
  }

  const firstVerse = highlightVerses[0]
  const lastVerse = highlightVerses[highlightVerses.length - 1]
  const isRange = highlightVerses.length > 1
  /** Next verse after the selection; footnotes use `[1]` etc. and must not end the highlight early. */
  const nextVerseAfterSelection = lastVerse + 1

  if (isRange) {
    const rangePattern = new RegExp(
      `(<sup[^>]*>${firstVerse}</sup>[\\s\\S]*?<sup[^>]*>${lastVerse}</sup>[\\s\\S]*?)(?=<sup[^>]*>${nextVerseAfterSelection}</sup>|$)`,
      'g'
    )

    processedText = processedText.replace(
      rangePattern,
      `<div id="verse-range-${firstVerse}-${lastVerse}" class="bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 border-l-4 border-blue-500 dark:border-blue-400 px-4 py-3 my-4 rounded-r-md shadow-sm"><div class="font-semibold text-slate-900 dark:text-slate-100 text-base leading-relaxed">$1</div></div>`
    )
  } else {
    const verseNum = firstVerse
    processedText = processedText.replace(
      new RegExp(
        `(<sup[^>]*>${verseNum}</sup>[\\s\\S]*?)(?=<sup[^>]*>${nextVerseAfterSelection}</sup>|$)`,
        'g'
      ),
      `<div id="verse-${verseNum}" class="bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 border-l-4 border-blue-500 dark:border-blue-400 px-4 py-3 my-4 rounded-r-md shadow-sm"><div class="font-semibold text-slate-900 dark:text-slate-100 text-base leading-relaxed">$1</div></div>`
    )
  }

  processedText = applyWordsOfChristPlain(processedText, showWordsOfChrist)
  return wrapScriptureSelahHtml(processedText)
}
