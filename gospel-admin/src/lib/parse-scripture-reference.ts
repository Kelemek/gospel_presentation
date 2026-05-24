/**
 * Parse a scripture reference into components (shared by DB-backed and API.Bible paths).
 * Examples: "John 3:16", "Genesis 1:1-3", "Psalm 23", "Isaiah 40:25–26"
 * Handles both hyphens (-) and en dashes (–) in verse ranges.
 * Strips letter suffixes like "a", "b" from verse numbers.
 */
export function parseReference(
  reference: string
): { book: string; chapter: number; verseStart: number | null; verseEnd: number | null } | null {
  const normalized = reference.replace(/–/g, '-').replace(/(\d+)[a-z]+/g, '$1')

  const match = normalized.match(/^(.+?)\s+(\d+)(?::\s*(\d+)(?:\s*-\s*(\d+))?)?$/)
  if (!match) return null

  return {
    book: match[1].trim(),
    chapter: parseInt(match[2], 10),
    verseStart: match[3] ? parseInt(match[3], 10) : null,
    verseEnd: match[4] ? parseInt(match[4], 10) : null,
  }
}
