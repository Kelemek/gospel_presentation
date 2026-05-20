/**
 * Calvin commentary HTML: italicize Latin so it reads distinct from English.
 */

const LATIN_WORD_RE =
  /\b(et|est|non|in|ad|de|per|cum|qui|quae|quod|ut|vel|aut|erat|sunt|fuit|esse|domini|dei|christi|jesu|domino|quemadmodum|propter|omnibus|autem|igitur|ergo|quia|enim|gratias|fidelis|spiritus|caro|verbum|ecclesia|apostolus|fratres|sanctus|dominus|patris|filio|spiritu|nostri|vestri|illius|ipsius|eorum|hominem|homo|mulier|mulierem)\b/gi

const ENGLISH_WORD_RE =
  /\b(the|and|that|you|your|was|were|have|has|shall|will|not|for|with|this|they|their|unto|hath|blessed|from|which|when|what|who|whom|into|upon|also|even|than|then|there|these|those|because|therefore|however|christ|god|lord)\b/gi

function stripTagsToPlain(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function countRegexMatches(text: string, re: RegExp): number {
  const flags = re.flags.includes('g') ? re.flags : `${re.flags}g`
  const global = new RegExp(re.source, flags)
  return [...text.matchAll(global)].length
}

/** Heuristic: Vulgate-style parallel verse line (not English commentary). */
export function looksLikeLatinText(plain: string): boolean {
  const t = plain.trim()
  if (t.length < 10) return false
  const latin = countRegexMatches(t, LATIN_WORD_RE)
  const english = countRegexMatches(t, ENGLISH_WORD_RE)
  if (latin >= 2 && latin > english) return true
  if (latin >= 1 && english === 0 && t.length >= 20) return true
  return false
}

function verseLabelPrefix(html: string): string | null {
  const m = /^\s*(<b>\s*\d+\s*\.?\s*<\/b>)/i.exec(html.trim())
  return m ? m[1] : null
}

function stripVerseLabel(html: string): string {
  return html.replace(/^\s*<b>\s*\d+\s*\.?\s*<\/b>\s*/i, '').trim()
}

function verseNumberFromBody(html: string): string | null {
  const m = /<b>\s*(\d+)\s*\.?\s*<\/b>/i.exec(html)
  return m ? m[1] : null
}

function alreadyWrappedInEm(html: string): boolean {
  const t = html.trim()
  return /^<em\b[^>]*>[\s\S]*<\/em>$/i.test(t) || /^<i\b[^>]*>[\s\S]*<\/i>$/i.test(t)
}

/** Wrap `lang="la"` spans in `<em>` when CCEL omitted italics. */
export function italicizeLatinLangSpans(html: string): string {
  return html.replace(
    /<span\b([^>]*\blang\s*=\s*["']la["'][^>]*)>([\s\S]*?)<\/span>/gi,
    (_match, attrs: string, inner: string) => {
      const trimmed = inner.trim()
      if (!trimmed) return `<span${attrs}></span>`
      if (alreadyWrappedInEm(trimmed)) return `<span${attrs}>${inner}</span>`
      return `<span${attrs}><em>${inner}</em></span>`
    }
  )
}

/**
 * Format one paragraph body (inside `<p>`) for storage.
 * `prevBody` is the previous paragraph body in the same subsection when available.
 */
export function formatCalvinParagraphBody(body: string, prevBody: string | null = null): string {
  let out = italicizeLatinLangSpans(body)

  if (prevBody) {
    const prevNum = verseNumberFromBody(prevBody)
    const curNum = verseNumberFromBody(out)
    if (prevNum && curNum && prevNum === curNum) {
      const prevPlain = stripTagsToPlain(stripVerseLabel(prevBody))
      const curPlain = stripTagsToPlain(stripVerseLabel(out))
      const prevLatin = looksLikeLatinText(prevPlain)
      const curLatin = looksLikeLatinText(curPlain)
      if (!prevLatin && curLatin && !alreadyWrappedInEm(stripVerseLabel(out))) {
        const label = verseLabelPrefix(out)
        const rest = stripVerseLabel(out)
        out = label ? `${label} <em>${rest}</em>` : `<em>${out}</em>`
      }
    }
  }

  return out
}

/** Apply Latin formatting to assembled subsection HTML (`<p>…</p>` blocks). */
export function formatCalvinSubsectionHtml(html: string): string {
  const parts: string[] = []
  const re = /<p\b[^>]*>([\s\S]*?)<\/p>/gi
  let m: RegExpExecArray | null
  let prevBody: string | null = null
  let lastIndex = 0
  while ((m = re.exec(html)) !== null) {
    parts.push(html.slice(lastIndex, m.index))
    const formatted = formatCalvinParagraphBody(m[1], prevBody)
    parts.push(`<p>${formatted}</p>`)
    prevBody = m[1]
    lastIndex = m.index + m[0].length
  }
  if (lastIndex < html.length) parts.push(html.slice(lastIndex))
  return parts.length > 0 ? parts.join('') : formatCalvinParagraphBody(html, null)
}
