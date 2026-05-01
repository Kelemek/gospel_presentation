/** Zero-width / BOM characters that break HTML tag recognition when pasted from editors. */
const INVISIBLE_BREAKERS = /[\u200B-\u200D\uFEFF]/g

/** True when markup likely uses HTML-encoded angle brackets (`&lt;` or nested `&amp;lt;…`). */
function looksHtmlEntityEncoded(html: string): boolean {
  return /&(?:amp;)*lt;/i.test(html)
}

function decodeEntitiesFallback(html: string): string {
  let s = html
  let prev = ''
  while (s !== prev) {
    prev = s
    s = s
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, '\u00a0')
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
      .replace(/&#x([0-9a-fA-F]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/&amp;/g, '&')
  }
  return s
}

function decodeWithTextareaLoop(html: string): string {
  let s = html
  for (let i = 0; i < 12; i++) {
    const t = document.createElement('textarea')
    t.innerHTML = s
    const next = t.value
    if (next === s) break
    s = next
  }
  return s
}

/**
 * Subsection / profile HTML for `dangerouslySetInnerHTML`:
 * - Strips invisible characters that break tags (ZWSP, etc.)
 * - Decodes numeric / hex angle entities (`&#60;` …) and fullwidth brackets
 * - Unescapes `\<` / `\>` (some exports escape both brackets; `\<` is applied before `\>` so `\</tag\>` closes correctly)
 * - Decodes stacked `&lt;` / `&amp;lt;` entity chains (CMS)
 *
 * Plain valid HTML passes through unchanged (textarea round-trip is stable).
 */
export function normalizeRichTextHtmlForInjection(html: string): string {
  if (!html) return ''

  let s = html.replace(INVISIBLE_BREAKERS, '')

  s = s
    .replace(/&#0*60;/gi, '<')
    .replace(/&#x0*3c;/gi, '<')
    .replace(/&#0*62;/gi, '>')
    .replace(/&#x0*3e;/gi, '>')

  s = s.replace(/\uFF1C/g, '<').replace(/\uFF1E/g, '>')

  if (s.includes('\\<') || s.includes('\\>')) {
    let t = s
    for (let i = 0; i < 16; i++) {
      const next = t.replace(/\\</g, '<').replace(/\\>/g, '>')
      if (next === t) break
      t = next
    }
    s = t
  }

  if (typeof document !== 'undefined') {
    s = decodeWithTextareaLoop(s)
    return s
  }

  if (looksHtmlEntityEncoded(s)) {
    return decodeEntitiesFallback(s)
  }
  return s
}
