import {
  PARAGRAPH_INDENT_OFF_CLASS,
  PARAGRAPH_INDENT_ON_CLASS,
  htmlClassFromIndentMarkup,
  indentMarkupFromHtmlClass,
} from '@/lib/paragraphIndentClasses'

describe('paragraphIndentClasses', () => {
  it('parses on and off classes from HTML class attribute', () => {
    expect(indentMarkupFromHtmlClass(PARAGRAPH_INDENT_ON_CLASS)).toBe('on')
    expect(indentMarkupFromHtmlClass(PARAGRAPH_INDENT_OFF_CLASS)).toBe('off')
    expect(indentMarkupFromHtmlClass('other paragraph-no-indent')).toBe('off')
    expect(indentMarkupFromHtmlClass(null)).toBe(null)
  })

  it('renders markup to class strings', () => {
    expect(htmlClassFromIndentMarkup('on')).toBe(PARAGRAPH_INDENT_ON_CLASS)
    expect(htmlClassFromIndentMarkup('off')).toBe(PARAGRAPH_INDENT_OFF_CLASS)
    expect(htmlClassFromIndentMarkup(null)).toBe(null)
  })
})
