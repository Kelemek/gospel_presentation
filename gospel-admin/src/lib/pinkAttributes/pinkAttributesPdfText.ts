/**
 * Clean Chapel Library PDF text lines before paragraph assembly.
 * Fixes page-break splits (blank lines + page numbers) and drops redundant running headers.
 */

function collapseInternalSpaces(line: string): string {
  return line.replace(/\s{2,}/g, ' ').trim()
}

function isPageNumberLine(line: string): boolean {
  return /^\d{1,3}\s*$/.test(line)
}

function isChapterMarkerLine(line: string): boolean {
  return /^Chapter \d+$/i.test(line)
}

function endsSentence(fragment: string): boolean {
  return /[.!?]["'»]?\s*$/.test(fragment.trim())
}

/** Short title-case line from the Chapel PDF (bold section head in print). */
export function isPinkAttributesSubheading(line: string): boolean {
  if (line.length < 8 || line.length > 55) return false
  if (/[.!?;:(),0-9]/.test(line)) return false
  if (isChapterMarkerLine(line)) return false
  if (line === line.toUpperCase() && line.length > 20) return false
  return /^[A-Z]/.test(line)
}

function normalizeForHeaderMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b(the|a|an)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Running margin header when the next prose line already names the same section. */
export function isRunningHeaderLine(line: string, nextLine: string): boolean {
  if (!isPinkAttributesSubheading(line)) return false
  const header = normalizeForHeaderMatch(line)
  const next = normalizeForHeaderMatch(nextLine)
  if (!next.includes(header)) return false
  const nextStart = nextLine.trim().toLowerCase()
  return /^let us now consider\b/.test(nextStart)
}

function peekNextContentLine(lines: string[], from: number): { index: number; line: string } | null {
  for (let j = from; j < lines.length; j++) {
    const line = collapseInternalSpaces(lines[j])
    if (!line) continue
    if (isPageNumberLine(line) || isChapterMarkerLine(line)) continue
    return { index: j, line }
  }
  return null
}

function joinAcrossPageBreak(last: string, continuation: string): string {
  const base = last.replace(/-\s*$/, '')
  const joiner = last.endsWith('-') ? '' : ' '
  return base + joiner + continuation
}

function shouldJoinAcrossBlankLines(current: string[]): boolean {
  if (current.length === 0) return false
  const last = current[current.length - 1]
  if (endsSentence(last)) return false
  return true
}

/**
 * Join PDF line breaks; blank lines separate paragraphs unless a page-break continuation follows.
 * Drops page numbers and redundant running headers; keeps real section subheadings as short paragraphs.
 */
export function linesToParagraphs(lines: string[]): string[] {
  const paragraphs: string[] = []
  let current: string[] = []

  const flush = () => {
    if (current.length === 0) return
    const joined = collapseInternalSpaces(current.join(' '))
    if (joined.length > 0) paragraphs.push(joined)
    current = []
  }

  let i = 0
  while (i < lines.length) {
    const line = collapseInternalSpaces(lines[i])
    if (!line) {
      if (shouldJoinAcrossBlankLines(current)) {
        const next = peekNextContentLine(lines, i + 1)
        if (next && /^[a-z]/.test(next.line)) {
          const lastIdx = current.length - 1
          current[lastIdx] = joinAcrossPageBreak(current[lastIdx], next.line)
          i = next.index + 1
          continue
        }
      }
      flush()
      i++
      continue
    }

    if (isPageNumberLine(line) || isChapterMarkerLine(line)) {
      i++
      continue
    }

    const next = peekNextContentLine(lines, i + 1)
    if (current.length > 0 && isPinkAttributesSubheading(line)) {
      const prev = current[current.length - 1]
      if (endsSentence(prev) || endsSentence(collapseInternalSpaces(current.join(' ')))) {
        if (next && isRunningHeaderLine(line, next.line)) {
          flush()
          i++
          continue
        }
        flush()
        paragraphs.push(line)
        i++
        continue
      }
    }

    if (next && isRunningHeaderLine(line, next.line)) {
      flush()
      i++
      continue
    }

    current.push(line)
    i++
  }

  flush()
  return paragraphs.filter((p) => p.length > 15)
}

/** Merge paragraphs that still begin with a lowercase continuation (safety net). */
export function mergeOrphanContinuations(paragraphs: string[]): string[] {
  const out: string[] = []
  for (const para of paragraphs) {
    if (out.length > 0 && /^[a-z]/.test(para) && !endsSentence(out[out.length - 1])) {
      out[out.length - 1] = joinAcrossPageBreak(out[out.length - 1], para)
    } else {
      out.push(para)
    }
  }
  return out
}

export function paragraphsFromPdfLines(lines: string[]): string[] {
  return mergeOrphanContinuations(linesToParagraphs(lines))
}
