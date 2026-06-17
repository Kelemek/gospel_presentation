export type BibleSearchSnippetPart = {
  text: string
  match: boolean
}

/** Split plain snippet text into segments, marking case-insensitive query matches. */
export function splitBibleSearchSnippetByQuery(
  text: string,
  query: string
): BibleSearchSnippetPart[] {
  const trimmedQuery = query.trim()
  if (!trimmedQuery || !text) {
    return [{ text, match: false }]
  }

  const escaped = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(escaped, 'gi')
  const parts: BibleSearchSnippetPart[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), match: false })
    }
    parts.push({ text: match[0], match: true })
    lastIndex = match.index + match[0].length
    if (match[0].length === 0) {
      pattern.lastIndex += 1
    }
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), match: false })
  }

  return parts.length > 0 ? parts : [{ text, match: false }]
}
