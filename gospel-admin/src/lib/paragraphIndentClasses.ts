/** First-line indent: explicit turn-on (stored on `<p>` or `<div>`). */
export const PARAGRAPH_INDENT_ON_CLASS = 'paragraph-first-line-indent'

/** Opt out of default `<p>` indent or explicit indent. */
export const PARAGRAPH_INDENT_OFF_CLASS = 'paragraph-no-indent'

export type ParagraphIndentMarkup = 'on' | 'off' | null

export function indentMarkupFromHtmlClass(className: string | null | undefined): ParagraphIndentMarkup {
  if (!className) return null
  const tokens = className.split(/\s+/).filter(Boolean)
  if (tokens.includes(PARAGRAPH_INDENT_OFF_CLASS)) return 'off'
  if (tokens.includes(PARAGRAPH_INDENT_ON_CLASS)) return 'on'
  return null
}

export function htmlClassFromIndentMarkup(markup: ParagraphIndentMarkup): string | null {
  if (markup === 'on') return PARAGRAPH_INDENT_ON_CLASS
  if (markup === 'off') return PARAGRAPH_INDENT_OFF_CLASS
  return null
}

export function indentMarkupRenderHtml(markup: ParagraphIndentMarkup): Record<string, string> {
  const cls = htmlClassFromIndentMarkup(markup)
  return cls ? { class: cls } : {}
}
