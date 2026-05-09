/**
 * @jest-environment jsdom
 */

import { locateListenVisibleTextOffset } from '@/lib/profileHighlightVisibleText'
import {
  locateListenRawTextOffset,
  plainTextForProfileResourceListen,
  visibleListenRawText,
} from '@/lib/profileResourceListenText'
import { walkerOffsetForReadAlongPlainOffset } from '@/lib/scrollReadAlongPlain'

describe('plainTextForProfileResourceListen', () => {
  it('strips data-gospel-mount subtrees', () => {
    document.body.innerHTML = `
      <div id="root">
        <p>Hello <span data-gospel-mount="1"><button>John 3:16</button></span> world.</p>
      </div>
    `
    const el = document.getElementById('root')!
    expect(plainTextForProfileResourceListen(el)).toBe('Hello world.')
  })

  it('removes buttons', () => {
    document.body.innerHTML = `
      <div id="root">
        <p>Line one <button type="button" aria-label="Remove">×</button> line two.</p>
      </div>
    `
    const el = document.getElementById('root')!
    expect(plainTextForProfileResourceListen(el)).toBe('Line one line two.')
  })

  it('normalizes whitespace', () => {
    document.body.innerHTML = `<div id="root"><p>  A   B  </p></div>`
    const el = document.getElementById('root')!
    expect(plainTextForProfileResourceListen(el)).toBe('A B')
  })

  it('omits h1–h6 heading text', () => {
    document.body.innerHTML =
      '<div id="root"><h2>Section title</h2><p>Paragraph body.</p></div>'
    const el = document.getElementById('root')!
    expect(plainTextForProfileResourceListen(el)).toBe('Paragraph body.')
    expect(visibleListenRawText(el)).toBe('Paragraph body.')
  })

  it('still reads body text after a skipped heading (implicit break between blocks)', () => {
    document.body.innerHTML =
      '<div id="root"><p>First</p><h3>Do not read</h3><p>Second</p></div>'
    const el = document.getElementById('root')!
    expect(visibleListenRawText(el)).toBe('First\nSecond')
    expect(plainTextForProfileResourceListen(el)).toBe('First Second')
  })
})

describe('locateListenRawTextOffset', () => {
  it('maps raw indices across implicit block breaks (flat locateListenVisibleTextOffset does not)', () => {
    document.body.innerHTML = '<div id="scope"><p>hello</p><p>world</p></div>'
    const scope = document.getElementById('scope') as HTMLElement
    const raw = visibleListenRawText(scope)
    expect(raw).toBe('hello\nworld')

    const plain = plainTextForProfileResourceListen(scope)
    expect(plain).toBe('hello world')
    const L = plain.length
    const w = walkerOffsetForReadAlongPlainOffset(scope, L, 6)
    expect(w).toBe(6)

    const atW = locateListenRawTextOffset(scope, 6)
    expect(atW).not.toBeNull()
    expect(atW!.node.textContent).toBe('world')
    expect(atW!.offset).toBe(0)

    const flatWrong = locateListenVisibleTextOffset(scope, 6)
    expect(flatWrong).not.toBeNull()
    expect(flatWrong!.node.textContent).toBe('world')
    expect(flatWrong!.offset).toBe(1)
  })

  it('returns end boundary at raw.length', () => {
    document.body.innerHTML = '<div id="scope"><p>ab</p></div>'
    const scope = document.getElementById('scope') as HTMLElement
    const rawLen = visibleListenRawText(scope).length
    const end = locateListenRawTextOffset(scope, rawLen)
    expect(end?.node.textContent).toBe('ab')
    expect(end?.offset).toBe(2)
  })
})
