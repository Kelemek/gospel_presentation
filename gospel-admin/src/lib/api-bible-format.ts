/**
 * Normalize API.Bible passage `content` (text or JSON string) into `[n] verse` chunks
 * so ScriptureModal's `processChapterText` can style verse numbers like ESV.
 *
 * Does **not** remove headings, titles, or scripture — only collapses whitespace and maps
 * common API shapes (bracket verse markers, JSON `verses` array, line-leading numbers).
 *
 * Strips occasional publisher markup leaked into `content-type=text` (e.g. `#— #` around an em dash).
 */
export function formatApiBiblePassageText(raw: string): string {
  const t = raw.trim().replace(/\r\n/g, '\n')
  if (!t) return t

  if (/\[\d+\]/.test(t)) {
    return finishApiBiblePassageText(t)
  }
  try {
    const parsed = JSON.parse(t) as unknown
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { verses?: unknown }).verses)) {
      const verses = (parsed as { verses: Array<{ verse?: number; number?: number; text?: string }> }).verses
      return finishApiBiblePassageText(
        verses
          .map((v) => {
            const n = v.verse ?? v.number
            const text = (v.text ?? '').trim()
            if (n == null) return text
            return `[${n}] ${text}`
          })
          .filter(Boolean)
          .join(' ')
      )
    }
  } catch {
    /* not JSON */
  }

  const lines = t.split(/\n/)
  const parts: string[] = []
  for (const line of lines) {
    const m = line.match(/^\s*(\d{1,3})\s+(.+)$/)
    if (m) {
      parts.push(`[${m[1]}] ${m[2].trim()}`)
    } else if (line.trim()) {
      parts.push(line.trim())
    }
  }
  if (parts.length > 0) {
    return finishApiBiblePassageText(parts.join(' '))
  }

  return finishApiBiblePassageText(t)
}

/** Em/en dash only — avoids touching hyphenated words. */
function stripHashWrappedDashes(s: string): string {
  return s.replace(/#\s*([\u2014\u2013])\s*#/g, '$1')
}

function finishApiBiblePassageText(s: string): string {
  return collapseWhitespace(stripHashWrappedDashes(s))
}

/**
 * Re-run {@link finishApiBiblePassageText} on text read from `scripture_cache` so older rows
 * pick up plain-text fixes without waiting for TTL.
 */
export function normalizeScriptureCachedText(text: string): string {
  return finishApiBiblePassageText(text)
}

function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}
