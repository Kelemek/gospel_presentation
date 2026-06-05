/** Decode common ThML entity escapes in `@title` and heading text. */
export function decodeThmlTitle(title: string): string {
  return title
    .trim()
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

function stripTagsToPlain(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeHtmlText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * CCEL ThML uses h2/h3 for section titles; some works (e.g. Baxter CHAPTER 3) have malformed h3
 * nodes that wrap entire `<p>` blocks. Unwrap those so prose is kept; turn short headings into
 * bold lead paragraphs so the reader matches the CCEL outline.
 */
export function normalizeThmlHeadingsForImport(inner: string): string {
  return inner.replace(/<h([23])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_full, _level, body: string) => {
    if (/<p\b/i.test(body)) return body
    const plain = decodeThmlTitle(stripTagsToPlain(body))
    if (!plain) return ''
    return `<p><strong>${escapeHtmlText(plain)}</strong></p>`
  })
}
