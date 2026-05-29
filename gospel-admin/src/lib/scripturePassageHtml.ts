export function verseSupHtml(n: number, showVerseNumbers: boolean): string {
  if (showVerseNumbers) {
    return `<sup class="text-blue-600 font-medium">${n}</sup>`
  }
  return `<sup class="hidden" aria-hidden="true">${n}</sup>`
}

function replaceVerseMarkers(text: string, showVerseNumbers: boolean): string {
  return text.replace(/\[(\d+)\]/g, (_match, n: string) => verseSupHtml(Number(n), showVerseNumbers))
}

function replaceParagraphBreaks(text: string): string {
  return text.replace(/\n\n/g, '</p><p class="mt-4">')
}

export function formatScripturePassageHtml(
  text: string,
  options: { showVerseNumbers: boolean }
): string {
  return replaceParagraphBreaks(replaceVerseMarkers(text, options.showVerseNumbers))
}

export function formatScriptureChapterHtml(
  text: string,
  options: { showVerseNumbers: boolean; highlightVerses: number[] }
): string {
  const { showVerseNumbers, highlightVerses } = options

  if (highlightVerses.length === 0) {
    return formatScripturePassageHtml(text, { showVerseNumbers })
  }

  const firstVerse = highlightVerses[0]
  const lastVerse = highlightVerses[highlightVerses.length - 1]
  const isRange = highlightVerses.length > 1
  /** Next verse after the selection; footnotes use `[1]` etc. and must not end the highlight early. */
  const nextVerseAfterSelection = lastVerse + 1

  let processedText = replaceParagraphBreaks(replaceVerseMarkers(text, showVerseNumbers))

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
