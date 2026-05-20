import {
  formatCalvinParagraphBody,
  italicizeLatinLangSpans,
  looksLikeLatinText,
} from '@/lib/calvin/calvinHtmlFormatting'

describe('calvinHtmlFormatting', () => {
  it('italicizes lang=la spans', () => {
    const html =
      'See <span lang="la" dir="ltr">spiritualis efficacia</span> in the footnote.'
    expect(italicizeLatinLangSpans(html)).toContain(
      '<span lang="la" dir="ltr"><em>spiritualis efficacia</em></span>'
    )
  })

  it('preserves existing i inside lang=la', () => {
    const html = '<span lang="la"><i>per ipsum</i></span>'
    expect(italicizeLatinLangSpans(html)).toBe(html)
  })

  it('detects Latin Vulgate lines', () => {
    expect(
      looksLikeLatinText(
        'Gratias ago Deo meo semper de vobis propter gratiam Dei, quae data vobis est in Christo Jesu.'
      )
    ).toBe(true)
    expect(
      looksLikeLatinText(
        'I thank my God always on your behalf, for the grace of God which is given you by Jesus Christ.'
      )
    ).toBe(false)
  })

  it('italicizes Latin verse line after English with same number', () => {
    const en = '<b>4.</b> I thank my God always on your behalf, for the grace of God.'
    const la =
      '<b>4.</b> Gratias ago Deo meo semper de vobis propter gratiam Dei, quae data vobis est in Christo Jesu.'
    const formatted = formatCalvinParagraphBody(la, en)
    expect(formatted).toContain('<b>4.</b>')
    expect(formatted).toContain('<em>Gratias ago Deo meo')
    expect(formatted).toContain('Christo Jesu.</em>')
  })
})
