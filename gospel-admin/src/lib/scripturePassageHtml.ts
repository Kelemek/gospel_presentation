import { SCRIPTURE_HIGHLIGHT_MARK_CLASSES } from '@/lib/scriptureHighlightStyles'
import type { ScriptureHighlightColorId } from '@/lib/scriptureHighlightStyles'

const SCRIPTURE_VERSE_NUMBER_CLICKABLE_CLASS =
  'scripture-verse-number cursor-pointer hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded-sm'

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
  return text.replace(/\n\n/g, '</p><p class="mt-4">')
}

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
  let html = replaceParagraphBreaks(replaceVerseMarkers(text, options.showVerseNumbers))
  if (options.savedHighlight) {
    const attrs = markAttrsForHighlight(options.savedHighlight.id, options.savedHighlight.colorId)
    html = `<mark ${attrs}>${html}</mark>`
  }
  return html
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
    replaceVerseMarkers(text, showVerseNumbers, clickableVerseNumbers)
  )

  if (savedHighlights.length > 0) {
    processedText = applySavedHighlightMarks(processedText, savedHighlights)
  }

  if (highlightVerses.length === 0) {
    return processedText
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

  return processedText
}
