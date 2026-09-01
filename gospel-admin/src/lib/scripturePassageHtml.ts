import { SCRIPTURE_HIGHLIGHT_MARK_CLASSES } from '@/lib/scriptureHighlightStyles'
import type { ScriptureHighlightColorId } from '@/lib/scriptureHighlightStyles'

const SCRIPTURE_VERSE_NUMBER_CLICKABLE_CLASS =
  'scripture-verse-number cursor-pointer hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded-sm'

/** ESV Psalm 119 acrostic section titles (longest first for safe matching). */
const PSALM_119_ACROSTIC_HEADINGS = [
  'Sin and Shin',
  'Aleph',
  'Beth',
  'Gimel',
  'Daleth',
  'He',
  'Waw',
  'Zayin',
  'Heth',
  'Teth',
  'Yodh',
  'Kaph',
  'Lamedh',
  'Mem',
  'Nun',
  'Samekh',
  'Ayin',
  'Pe',
  'Tsadhe',
  'Qoph',
  'Resh',
  'Taw',
] as const

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Psalm 119 acrostic titles after the first often sit inline before the next verse
 * (e.g. "...heart! He [33]"). Break them onto their own paragraph like Daleth at v25.
 */
export function isolatePsalm119AcrosticHeadings(text: string): string {
  let out = text
  for (const heading of PSALM_119_ACROSTIC_HEADINGS) {
    const escaped = escapeRegExp(heading).replace(/ /g, '\\s+')
    const beforeVerse = new RegExp(`(\\S)\\s+(${escaped})(?=\\s*\\[\\d{1,3}\\])`, 'g')
    out = out.replace(beforeVerse, `$1\n\n$2\n\n`)
  }
  return out.replace(/\n\n[ \t]+(?=\[\d{1,3}\])/g, '\n\n')
}

function prepareScripturePassageText(text: string): string {
  return isolatePsalm119AcrosticHeadings(text)
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
    `(<sup[^>]*>${verseStart}</sup>[\\s\\S]*?<sup[^>]*>${verseEnd}</sup>[^<]*?)(?=<sup[^>]*>${nextVerseAfterSelection}</sup>|$)`,
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
    savedHighlight?: ScripturePassageSavedHighlightOption
  }
): string {
  let html = replaceParagraphBreaks(
    replaceVerseMarkers(prepareScripturePassageText(text), options.showVerseNumbers)
  )
  if (options.savedHighlight) {
    const attrs = markAttrsForHighlight(options.savedHighlight.id, options.savedHighlight.colorId)
    html = `<mark ${attrs}>${html}</mark>`
  }
  return wrapScriptureSelahHtml(html)
}

export function formatScriptureChapterHtml(
  text: string,
  options: {
    showVerseNumbers: boolean
    highlightVerses: number[]
    savedHighlights?: readonly ScripturePassageSavedHighlight[]
    clickableVerseNumbers?: boolean
  }
): string {
  const {
    showVerseNumbers,
    highlightVerses,
    savedHighlights = [],
    clickableVerseNumbers = false,
  } = options

  let processedText = replaceParagraphBreaks(
    replaceVerseMarkers(prepareScripturePassageText(text), showVerseNumbers, clickableVerseNumbers)
  )

  if (savedHighlights.length > 0) {
    processedText = applySavedHighlightMarks(processedText, savedHighlights)
  }

  if (highlightVerses.length === 0) {
    return wrapScriptureSelahHtml(processedText)
  }

  const firstVerse = highlightVerses[0]
  const lastVerse = highlightVerses[highlightVerses.length - 1]
  const isRange = highlightVerses.length > 1
  /** Next verse after the selection; footnotes use `[1]` etc. and must not end the highlight early. */
  const nextVerseAfterSelection = lastVerse + 1

  if (isRange) {
    const rangePattern = new RegExp(
      `(<sup[^>]*>${firstVerse}</sup>[\\s\\S]*?<sup[^>]*>${lastVerse}</sup>[^<]*?)(?=<sup[^>]*>${nextVerseAfterSelection}</sup>|$)`,
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

  return wrapScriptureSelahHtml(processedText)
}
