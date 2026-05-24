/**
 * @jest-environment jsdom
 */

import { locateListenVisibleTextOffset } from '@/lib/profileHighlightVisibleText'
import {
  isListenOmitHeadingProfileSlug,
  listenCollapsedPlainFromRaw,
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

  it('includes inline scripture mount reference (scripture card button)', () => {
    document.body.innerHTML = `
      <div id="root">
        <p>Before <span data-gospel-mount="scripture" data-gospel-ref="Acts 1:1"><button type="button" data-tour="scripture-card">Acts 1:1</button></span> after.</p>
      </div>
    `
    const el = document.getElementById('root')!
    expect(plainTextForProfileResourceListen(el)).toBe('Before Acts 1:1 after.')
  })

  it('includes block verse card button label', () => {
    document.body.innerHTML = `
      <div id="root">
        <p>Intro</p>
        <div class="flex"><button type="button" data-tour="scripture-card">John 3:16</button></div>
      </div>
    `
    const el = document.getElementById('root')!
    expect(plainTextForProfileResourceListen(el)).toBe('Intro John 3:16')
  })

  it('omits unpin control text inside scripture mount', () => {
    document.body.innerHTML = `
      <div id="root">
        <p>
          <span data-gospel-mount="scripture" data-gospel-ref="Rom 8:28">
            <button type="button" data-tour="scripture-card">Rom 8:28</button>
            <button type="button" data-tour="scripture-progress-unpin" aria-label="Remove">×</button>
          </span>
        </p>
      </div>
    `
    const el = document.getElementById('root')!
    expect(plainTextForProfileResourceListen(el)).toBe('Rom 8:28')
  })

  it('normalizes whitespace', () => {
    document.body.innerHTML = `<div id="root"><p>  A   B  </p></div>`
    const el = document.getElementById('root')!
    expect(plainTextForProfileResourceListen(el)).toBe('A B')
  })

  it('includes h1–h6 heading text by default', () => {
    document.body.innerHTML =
      '<div id="root"><h2>Section title</h2><p>Paragraph body.</p></div>'
    const el = document.getElementById('root')!
    expect(plainTextForProfileResourceListen(el)).toBe('Section title Paragraph body.')
    expect(visibleListenRawText(el)).toBe('Section title\nParagraph body.')
  })

  it('with omitHeadingText, omits h1–h6 heading text', () => {
    document.body.innerHTML =
      '<div id="root"><h2>Section title</h2><p>Paragraph body.</p></div>'
    const el = document.getElementById('root')!
    const opts = { omitHeadingText: true } as const
    expect(plainTextForProfileResourceListen(el, opts)).toBe('Paragraph body.')
    expect(visibleListenRawText(el, opts)).toBe('Paragraph body.')
  })

  it('includes heading text between paragraphs by default (implicit breaks)', () => {
    document.body.innerHTML =
      '<div id="root"><p>First</p><h3>Subhead</h3><p>Second</p></div>'
    const el = document.getElementById('root')!
    expect(visibleListenRawText(el)).toBe('First\nSubhead\nSecond')
    expect(plainTextForProfileResourceListen(el)).toBe('First Subhead Second')
  })
})

describe('listenCollapsedPlainFromRaw', () => {
  it('joins block segments with a single space', () => {
    expect(listenCollapsedPlainFromRaw('Intro\nJohn 3:16')).toBe('Intro John 3:16')
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

describe('isListenOmitHeadingProfileSlug', () => {
  it('matches Spurgeon, Edwards, Matthew Henry, and Luther Galatians slugs', () => {
    expect(isListenOmitHeadingProfileSlug('sg00001')).toBe(true)
    expect(isListenOmitHeadingProfileSlug('je12')).toBe(true)
    expect(isListenOmitHeadingProfileSlug('mhgen')).toBe(true)
    expect(isListenOmitHeadingProfileSlug('lgal')).toBe(true)
  })

  it('does not match other profile slugs', () => {
    expect(isListenOmitHeadingProfileSlug('default')).toBe(false)
    expect(isListenOmitHeadingProfileSlug('cvgen')).toBe(false)
    expect(isListenOmitHeadingProfileSlug('')).toBe(false)
  })
})
