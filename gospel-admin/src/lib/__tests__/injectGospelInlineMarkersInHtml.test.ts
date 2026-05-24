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

  it('segments comma verse lists as a hyphen range for verse cards', () => {
    const segs = segmentPlainTextForGospelInlines('See 2 Peter 1:16,17 here.')
    expect(segs).toEqual([
      { kind: 'text', value: 'See ' },
      { kind: 'scripture', cleanRef: '2 Peter 1:16-17', rawLength: '2 Peter 1:16,17'.length },
      { kind: 'text', value: ' here.' },
    ])
  })

  it('segments scripture with following-verse marker (f.)', () => {
    const segs = segmentPlainTextForGospelInlines('See Colossians 1:16f. here.')
    expect(segs).toEqual([
      { kind: 'text', value: 'See ' },
      { kind: 'scripture', cleanRef: 'Colossians 1:16', rawLength: 'Colossians 1:16f.'.length },
      { kind: 'text', value: ' here.' },
    ])
  })

  it('segments chapter-only refs (Pilgrim prose)', () => {
    const segs = segmentPlainTextForGospelInlines(
      'at the bar. 1 Corinthians 15; Jude 15; John 5:28,29;'
    )
    const refs = segs.filter((s) => s.kind === 'scripture').map((s) => (s.kind === 'scripture' ? s.cleanRef : ''))
    expect(refs).toEqual(['1 Corinthians 15', 'Jude 15', 'John 5:28-29'])
  })

  it('segments refs with space after colon (CCEL Pilgrim)', () => {
    const segs = segmentPlainTextForGospelInlines(
      'John 5: 28,29; 2 Thessalonians 1: 8-10; Revelation 20: 11-14;'
    )
    const refs = segs.filter((s) => s.kind === 'scripture').map((s) => (s.kind === 'scripture' ? s.cleanRef : ''))
    expect(refs).toEqual(['John 5:28-29', '2 Thessalonians 1:8-10', 'Revelation 20:11-14'])
  })

  it('covers orphan abbrev letters in DOM range (R Revelation, J John)', () => {
    const html = '<p>R Revelation 4:4 and J John 12:25 here.</p>'
    const out = injectGospelInlineMarkersInHtml(html, document)
    expect(out).toContain('data-gospel-ref="Revelation 4:4"')
    expect(out).toContain('data-gospel-ref="John 12:25"')
    const host = document.createElement('div')
    host.innerHTML = out
    expect(host.textContent).not.toMatch(/\bR\s+Revelation/)
    expect(host.textContent).not.toMatch(/\bJ\s+John/)
  })

  it('segments inherited semicolon refs without mutating string length (Revelation 1; 4:4)', () => {
    const segs = segmentPlainTextForGospelInlines('Revelation 1; 4:4 end.')
    const refs = segs.filter((s) => s.kind === 'scripture')
    expect(refs).toEqual([
      { kind: 'scripture', cleanRef: 'Revelation 1', rawLength: 'Revelation 1'.length },
      { kind: 'scripture', cleanRef: 'Revelation 4:4', rawLength: '; 4:4'.length },
    ])
  })

  it('segments 1 Thessalonians after CCEL Isaiah 1 typo (Pilgrim)', () => {
    const segs = segmentPlainTextForGospelInlines(
      'Isaiah 6:2; Isaiah 1 Thessalonians 4:16-17; Revelation 5:11;'
    )
    const refs = segs.filter((s) => s.kind === 'scripture').map((s) => (s.kind === 'scripture' ? s.cleanRef : ''))
    expect(refs).toEqual(['Isaiah 6:2', '1 Thessalonians 4:16-17', 'Revelation 5:11'])
  })

  it('inherits book number for ; Thessalonians after 1 Thessalonians', () => {
    const segs = segmentPlainTextForGospelInlines('see 1 Thessalonians 4:16; Thessalonians 4:16-17.')
    const refs = segs.filter((s) => s.kind === 'scripture').map((s) => (s.kind === 'scripture' ? s.cleanRef : ''))
    expect(refs).toEqual(['1 Thessalonians 4:16', '1 Thessalonians 4:16-17'])
  })

  it('segments bare chapter:verse after semicolon using preceding book (Pilgrim prose)', () => {
    const segs = segmentPlainTextForGospelInlines('Psalms 5:4 ; 50:1-3 ; Malachi 3:2.')
    const refs = segs.filter((s) => s.kind === 'scripture')
    expect(refs).toEqual([
      { kind: 'scripture', cleanRef: 'Psalms 5:4', rawLength: 'Psalms 5:4'.length },
      { kind: 'scripture', cleanRef: 'Psalms 50:1-3', rawLength: ' ; 50:1-3'.length },
      { kind: 'scripture', cleanRef: 'Malachi 3:2', rawLength: 'Malachi 3:2'.length },
    ])
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
