import { coerceHighlightMarkBlockChildren } from '@/lib/coerceHighlightMarkBlockChildren'

describe('coerceHighlightMarkBlockChildren', () => {
  it('moves <mark> inside a sole wrapped <p> (valid phrasing parent)', () => {
    document.body.innerHTML = ''
    const wrap = document.createElement('div')
    wrap.innerHTML =
      '<mark data-resource-highlight-id="x"><p>Waiting upon God this evening.</p></mark>'
    document.body.appendChild(wrap)

    const mark = wrap.querySelector('mark') as HTMLElement
    coerceHighlightMarkBlockChildren(mark)

    const p = wrap.querySelector('p')
    const innerMark = wrap.querySelector('mark[data-resource-highlight-id="x"]')
    expect(p?.parentElement).toBe(wrap)
    expect(p?.contains(innerMark ?? null)).toBe(true)
    expect(innerMark?.textContent).toContain('Waiting upon God this evening.')
    expect(wrap.querySelectorAll('p').length).toBe(1)
  })

  it('does nothing when mark has no block child', () => {
    document.body.innerHTML = ''
    const wrap = document.createElement('div')
    wrap.innerHTML = '<mark data-resource-highlight-id="y"><strong>Only</strong> phrasing.</mark>'
    document.body.appendChild(wrap)
    const mark = wrap.querySelector('mark') as HTMLElement
    const before = wrap.innerHTML
    coerceHighlightMarkBlockChildren(mark)
    expect(wrap.innerHTML).toBe(before)
  })

  it('does nothing when two block children would require splitting (avoid invalid p in p)', () => {
    document.body.innerHTML = ''
    const wrap = document.createElement('div')
    wrap.innerHTML =
      '<mark data-resource-highlight-id="z"><p>One</p><p>Two</p></mark>'
    document.body.appendChild(wrap)
    const mark = wrap.querySelector('mark') as HTMLElement
    const before = wrap.innerHTML
    coerceHighlightMarkBlockChildren(mark)
    expect(wrap.innerHTML).toBe(before)
  })
})
