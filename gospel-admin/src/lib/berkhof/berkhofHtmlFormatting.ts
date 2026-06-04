/**
 * Berkhof ThML stores outline markers (1., a., …) as plain text, not <b>.
 * Wrap them in <strong> so presentation prose styles them like other outlines.
 */

/** True when the paragraph body already has a bold outline prefix. */
function hasBoldOutlinePrefix(html: string): boolean {
  return /^(\s*)<strong>\s*(\d{1,2}|[a-z])\s*\.\s*<\/strong>/i.test(html.trimStart())
}

/**
 * Bold the first outline marker at the start of a paragraph body (after unwrapScripRefTags).
 * Matches CCEL patterns: ` 1. TITLE`, `1. THE…`, `a.<span`, ` b. …`.
 */
export function boldBerkhofOutlineMarkers(html: string): string {
  if (!html.trim() || hasBoldOutlinePrefix(html)) return html

  const numbered = html.replace(/^(\s*)(\d{1,2})\.(\s+)/, '$1<strong>$2.</strong>$3')
  if (numbered !== html) return numbered

  return html.replace(/^(\s*)([a-z])\.(\s*)/, '$1<strong>$2.</strong>$3')
}
