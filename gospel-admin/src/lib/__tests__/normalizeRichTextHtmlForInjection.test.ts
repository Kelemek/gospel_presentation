import { normalizeRichTextHtmlForInjection } from '../normalizeRichTextHtmlForInjection'

describe('normalizeRichTextHtmlForInjection', () => {
  it('leaves normal HTML unchanged', () => {
    const raw = '<p>Hello <strong>x</strong></p>'
    expect(normalizeRichTextHtmlForInjection(raw)).toBe(raw)
  })

  it('decodes entity-encoded tags so they become markup', () => {
    const encoded =
      '&lt;p&gt;x &lt;strong&gt;bold&lt;/strong&gt;.&lt;/p&gt;'
    expect(normalizeRichTextHtmlForInjection(encoded)).toBe(
      '<p>x <strong>bold</strong>.</p>'
    )
  })

  it('handles double-encoded amp prefixes', () => {
    expect(
      normalizeRichTextHtmlForInjection('&amp;lt;em&amp;gt;hi&amp;lt;/em&amp;gt;')
    ).toBe('<em>hi</em>')
  })

  it('decodes numeric angle entities', () => {
    expect(
      normalizeRichTextHtmlForInjection('&#60;strong&#62;A&#60;/strong&#62;')
    ).toBe('<strong>A</strong>')
  })

  it('strips ZWSP inside tag names', () => {
    const withZwsp = '<str\u200Bong>y</strong>'
    expect(normalizeRichTextHtmlForInjection(withZwsp)).toBe('<strong>y</strong>')
  })

  it('unescapes backslash before angle brackets', () => {
    expect(normalizeRichTextHtmlForInjection(String.raw`\<strong>x\</strong>`)).toBe(
      '<strong>x</strong>'
    )
  })

  it('unescapes both \\< and \\> on opening tags (\\<em\\>…\\</em\\>)', () => {
    expect(normalizeRichTextHtmlForInjection(String.raw`\<em\>text\</em\>`)).toBe(
      '<em>text</em>'
    )
  })

  it('returns empty string for empty input', () => {
    expect(normalizeRichTextHtmlForInjection('')).toBe('')
  })
})
