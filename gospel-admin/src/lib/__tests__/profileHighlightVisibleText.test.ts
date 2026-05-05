/**
 * @jest-environment jsdom
 */

import {
  locateVisibleTextOffset,
  plainTextForProfileHighlightUi,
  preferLaterEquivalentTextBoundary,
  totalVisiblePlainTextLength,
  visibleTextLengthBeforeBoundary,
} from '@/lib/profileHighlightVisibleText'

describe('profileHighlightVisibleText', () => {
  it('excludes characters inside data-gospel-mount from the counted stream', () => {
    const scope = document.createElement('div')
    scope.innerHTML = '<p>Before<span data-gospel-mount="scripture"></span>After</p>'
    const mount = scope.querySelector('[data-gospel-mount]')!
    mount.appendChild(document.createTextNode('SKIPREF'))

    const p = scope.querySelector('p')!
    const [beforeTn, , afterTn] = p.childNodes
    expect(beforeTn.textContent).toBe('Before')
    expect(afterTn.textContent).toBe('After')

    expect(visibleTextLengthBeforeBoundary(scope, beforeTn, 'Before'.length)).toBe('Before'.length)
    expect(totalVisiblePlainTextLength(scope)).toBe('BeforeAfter'.length)
    expect(visibleTextLengthBeforeBoundary(scope, afterTn, 0)).toBe('Before'.length)
  })

  it('visibleTextLengthBeforeBoundary matches canonical boundary via Range semantics', () => {
    const scope = document.createElement('div')
    scope.innerHTML = '<p>abcdefghij</p>'
    const tn = scope.querySelector('p')!.firstChild as Text
    expect(visibleTextLengthBeforeBoundary(scope, tn, 5)).toBe(5)
  })

  it('locateVisibleTextOffset resolves offsets in the merged stream', () => {
    const scope = document.createElement('div')
    scope.innerHTML = '<p>Hello<span data-gospel-mount="scripture">X</span>world</p>'

    expect(totalVisiblePlainTextLength(scope)).toBe('Helloworld'.length)

    const atHelloEnd = locateVisibleTextOffset(scope, 5)
    expect(atHelloEnd?.node.textContent).toBe('Hello')
    expect(atHelloEnd?.offset).toBe(5)

    const atWorldMid = locateVisibleTextOffset(scope, 8)
    expect(atWorldMid?.node.textContent).toBe('world')
    expect(atWorldMid?.offset).toBe(3)
  })

  it('locate prefers later boundary past a decorative span char (no mount between)', () => {
    const scope = document.createElement('div')
    scope.innerHTML =
      '<p><span>"</span>Mortals, be dumb! What creature dares</p><p>Second paragraph ignored</p>'
    const p = scope.querySelector('p')!
    const quoteText = (p.childNodes[0] as HTMLElement).firstChild as Text
    expect(quoteText.data).toBe('"')

    const afterQuote = p.childNodes[1] as Text
    expect(afterQuote.data.startsWith('Mortals')).toBe(true)

    const junction = locateVisibleTextOffset(scope, 1)!
    expect(junction.node).toBe(afterQuote)
    expect(junction.offset).toBe(0)
    expect(visibleTextLengthBeforeBoundary(scope, junction.node, junction.offset)).toBe(1)

    const refined = preferLaterEquivalentTextBoundary(scope, { node: quoteText, offset: 1 })
    expect(refined.node).toBe(afterQuote)
    expect(refined.offset).toBe(0)

    const endExclusive = visibleTextLengthBeforeBoundary(scope, afterQuote, 10)
    const endPt = locateVisibleTextOffset(scope, endExclusive)!
    expect(visibleTextLengthBeforeBoundary(scope, endPt.node, endPt.offset)).toBe(endExclusive)
  })

  it('locate prefers earlier boundary when a gospel mount separates equivalent junctions', () => {
    const scope = document.createElement('div')
    scope.innerHTML = '<p>Hello<span data-gospel-mount="s"></span>world</p>'
    const mount = scope.querySelector('[data-gospel-mount]')!
    mount.appendChild(document.createTextNode('S'))
    expect(totalVisiblePlainTextLength(scope)).toBe(10)
    const atJunction = locateVisibleTextOffset(scope, 5)
    expect(atJunction?.node.textContent).toBe('Hello')
    expect(atJunction?.offset).toBe(5)
  })

  it('plainTextForProfileHighlightUi strips tags and collapses whitespace', () => {
    const raw =
      'Then praise.<strong>Fear</strong></p><p>More text'
    expect(plainTextForProfileHighlightUi(raw)).toBe('Then praise. Fear More text')
  })

  it('plainTextForProfileHighlightUi decodes common entities after stripping', () => {
    expect(plainTextForProfileHighlightUi('A &amp; B')).toBe('A & B')
  })
})
