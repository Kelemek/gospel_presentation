/** Numbered outline point at the start of a paragraph (e.g. "1. It should be our first care…"). */
export function isLecturesToMyStudentsOutlineHeading(paragraph: string): boolean {
  return /^\d+\.\s+/.test(paragraph.trim())
}
