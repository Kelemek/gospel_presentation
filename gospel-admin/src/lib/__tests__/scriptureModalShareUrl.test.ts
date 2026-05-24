import { buildScriptureModalShareUrl, appendScriptureShareLink } from '../scriptureModalShareUrl'

describe('buildScriptureModalShareUrl', () => {
  it('targets the given profile slug with encoded scriptureRef', () => {
    const url = buildScriptureModalShareUrl({
      origin: 'https://gospel.example.com',
      profileSlug: 'default',
      reference: 'John 3:16',
    })
    expect(url).toBe(
      'https://gospel.example.com/default?scriptureRef=John+3%3A16'
    )
  })

  it('uses the resource slug when not default', () => {
    const url = buildScriptureModalShareUrl({
      origin: 'https://gospel.example.com',
      profileSlug: 'sg00042',
      reference: 'Romans 8:28',
    })
    expect(url).toBe(
      'https://gospel.example.com/sg00042?scriptureRef=Romans+8%3A28'
    )
  })

  it('strips leading and trailing slashes from profile slug', () => {
    const url = buildScriptureModalShareUrl({
      origin: 'https://gospel.example.com',
      profileSlug: '/p1/',
      reference: 'John 1:1',
    })
    expect(url).toContain('https://gospel.example.com/p1?')
  })

  it('normalizes en-dash to hyphen in reference', () => {
    const url = buildScriptureModalShareUrl({
      origin: 'https://gospel.example.com/',
      profileSlug: 'default',
      reference: 'Isaiah 40:25–26',
    })
    expect(url).toContain('scriptureRef=Isaiah+40%3A25-26')
  })

  it('includes translation and chapter view when set', () => {
    const url = buildScriptureModalShareUrl({
      origin: 'https://gospel.example.com',
      profileSlug: 'default',
      reference: 'Genesis 1',
      translation: 'ESV',
      scriptureView: 'chapter',
    })
    expect(url).toContain('/default?')
    expect(url).toContain('scriptureRef=Genesis+1')
    expect(url).toContain('translation=esv')
    expect(url).toContain('scriptureView=chapter')
  })
})

describe('appendScriptureShareLink', () => {
  it('appends intro line and url after passage body', () => {
    const out = appendScriptureShareLink(
      'John 3:16 (ESV)\n\nFor God so loved…',
      'https://x/sg00001?scriptureRef=John'
    )
    expect(out).toContain('For God so loved')
    expect(out).toContain('Open in The Gospel Presentation:')
    expect(out).toContain('https://x/sg00001?scriptureRef=John')
  })
})
