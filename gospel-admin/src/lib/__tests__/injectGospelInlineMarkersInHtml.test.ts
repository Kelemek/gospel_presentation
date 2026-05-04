/**
 * @jest-environment jsdom
 */
import { injectGospelInlineMarkersInHtml, segmentPlainTextForGospelInlines } from '@/lib/injectGospelInlineMarkersInHtml'

describe('segmentPlainTextForGospelInlines', () => {
  it('segments COMA then Four Rules then scripture in one string', () => {
    const segs = segmentPlainTextForGospelInlines('See COMA and Four Rules of Communication plus Acts 1:1.')
    expect(segs).toEqual([
      { kind: 'text', value: 'See ' },
      { kind: 'coma', label: 'COMA' },
      { kind: 'text', value: ' and ' },
      { kind: 'fourRules' },
      { kind: 'text', value: ' plus ' },
      { kind: 'scripture', cleanRef: 'Acts 1:1', rawLength: 'Acts 1:1'.length },
      { kind: 'text', value: '.' },
    ])
  })

  it('does not treat unknown books as scripture', () => {
    const segs = segmentPlainTextForGospelInlines('Hebrew 11:1 is not a book')
    expect(segs).toEqual([{ kind: 'text', value: 'Hebrew 11:1 is not a book' }])
  })

  it('treats en-dash verse ranges like a hyphen so the full range is one scripture ref', () => {
    const segs = segmentPlainTextForGospelInlines('See Acts 26:15–18 here.')
    expect(segs).toEqual([
      { kind: 'text', value: 'See ' },
      { kind: 'scripture', cleanRef: 'Acts 26:15-18', rawLength: 'Acts 26:15-18'.length },
      { kind: 'text', value: ' here.' },
    ])
  })
})

describe('injectGospelInlineMarkersInHtml', () => {
  it('preserves ol/li structure when scripture appears inside a list item', () => {
    const html =
      '<ol><li><p>a. Quote</p></li><li><p>b. See Acts 26:15-18 here.</p></li><li><p>c. More</p></li></ol>'
    const out = injectGospelInlineMarkersInHtml(html, document)
    expect(out).toContain('<ol>')
    expect(out).toContain('</ol>')
    expect(out).toContain('data-gospel-mount="scripture"')
    expect(out).toContain('data-gospel-ref="Acts 26:15-18"')
    expect(out.match(/<ol/g)?.length).toBe(1)
    expect(out.match(/<\/ol>/g)?.length).toBe(1)
    const host = document.createElement('div')
    host.innerHTML = out
    expect(host.querySelectorAll('li').length).toBe(3)
  })

  it('injects COMA mount inside list item text', () => {
    const html = '<ul><li><p>Use COMA here.</p></li></ul>'
    const out = injectGospelInlineMarkersInHtml(html, document)
    expect(out).toContain('data-gospel-mount="coma"')
    expect(out).toContain('data-gospel-coma-label="COMA"')
  })

  it('injects scripture when book and chapter:verse are split across inline tags (TipTap)', () => {
    const html = '<p>b. <strong>Acts</strong> 26:15-18 and more.</p>'
    const out = injectGospelInlineMarkersInHtml(html, document)
    expect(out).toContain('data-gospel-mount="scripture"')
    expect(out).toContain('data-gospel-ref="Acts 26:15-18"')
    expect(out).toContain('and more.')
  })

  it('injects scripture when bold ends flush before chapter digits (no space in flat text)', () => {
    const html = '<p>See <strong>Acts</strong>26:15-18.</p>'
    const out = injectGospelInlineMarkersInHtml(html, document)
    expect(out).toContain('data-gospel-mount="scripture"')
    expect(out).toContain('data-gospel-ref="Acts 26:15-18"')
  })

  it('does not treat task list li as a block (uses inner p only)', () => {
    const html =
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="false">' +
      '<label><input type="checkbox"><span></span></label>' +
      '<div><p>John 3:16 here</p></div></li></ul>'
    const out = injectGospelInlineMarkersInHtml(html, document)
    expect(out).toContain('data-gospel-ref="John 3:16"')
    expect(out).toContain('type="checkbox"')
  })

  it('injects clickable scripture from CCEL-style sermon body (canonical ref in paragraph)', () => {
    const html = '<p class="Body">(No. 7) Intro John 1:1 and more.</p>'
    const out = injectGospelInlineMarkersInHtml(html, document)
    expect(out).toContain('data-gospel-mount="scripture"')
    expect(out).toContain('data-gospel-ref="John 1:1"')
  })

  it('handles a single wrapper div with no paragraph', () => {
    const html = '<div>See Ephesians 5:8.</div>'
    const out = injectGospelInlineMarkersInHtml(html, document)
    expect(out).toContain('data-gospel-ref="Ephesians 5:8"')
  })

  it('handles plain HTML string with no block tags (phrasing-only fragment)', () => {
    const html = 'Mention COMA and Four Rules of Communication here.'
    const out = injectGospelInlineMarkersInHtml(html, document)
    expect(out).toContain('data-gospel-mount="coma"')
    expect(out).toContain('data-gospel-mount="fourRules"')
  })
})
