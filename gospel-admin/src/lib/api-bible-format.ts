/**
 * Normalize API.Bible passage `content` (text or JSON string) into `[n] verse` chunks
 * so ScriptureModal's `processChapterText` can style verse numbers like ESV.
 */
export function formatApiBiblePassageText(raw: string): string {
  let t = raw.trim().replace(/\r\n/g, '\n')
  if (!t) return t

  if (/\[\d+\]/.test(t)) {
    return collapseWhitespace(t)
  }

  try {
    const parsed = JSON.parse(t) as unknown
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { verses?: unknown }).verses)) {
      const verses = (parsed as { verses: Array<{ verse?: number; number?: number; text?: string }> }).verses
      return verses
        .map((v) => {
          const n = v.verse ?? v.number
          const text = (v.text ?? '').trim()
          if (n == null) return text
          return `[${n}] ${text}`
        })
        .filter(Boolean)
        .join(' ')
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
    return collapseWhitespace(parts.join(' '))
  }

  return collapseWhitespace(t)
}

function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}
