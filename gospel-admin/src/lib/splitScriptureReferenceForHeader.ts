/**
 * Splits a typical "Book … chapter:verse" reference for header display:
 * the book part can truncate with ellipsis while chapter/verse stay visible.
 *
 * Examples: "Deuteronomy 4:35" → book + "4:35"; "1 John 1:1" → "1 John" + "1:1"
 */
export function splitScriptureReferenceForHeader(reference: string): {
  book: string
  referenceSuffix: string
} {
  const s = reference.trim()
  if (!s) {
    return { book: '', referenceSuffix: '' }
  }

  // Last space before a chapter:verse tail (digits:digits, optional ranges / lists)
  const withVerses = s.match(/^(.*)\s+(\d+:\d+[\d:–\-,\s]*)$/u)
  if (withVerses) {
    return {
      book: withVerses[1].trim(),
      referenceSuffix: withVerses[2].trim(),
    }
  }

  // Chapter only (no verse), e.g. "Psalm 23"
  const chapterOnly = s.match(/^(.*)\s+(\d+)\s*$/u)
  if (chapterOnly) {
    return {
      book: chapterOnly[1].trim(),
      referenceSuffix: chapterOnly[2].trim(),
    }
  }

  return { book: s, referenceSuffix: '' }
}
