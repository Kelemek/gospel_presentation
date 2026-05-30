/**
 * @jest-environment jsdom
 */

import {
  getScriptureListenCaretClientRect,
  plainTextForScriptureListen,
  SCRIPTURE_LISTEN_TEXT_OPTIONS,
  visibleScriptureListenRawText,
} from '@/lib/scriptureListenPlainText'

describe('scriptureListenPlainText', () => {
  it('visibleScriptureListenRawText skips verse sup elements', () => {
    document.body.innerHTML =
      '<div id="scope"><p><sup class="text-blue-600 font-medium">1</sup> In the beginning</p></div>'
    const scope = document.getElementById('scope') as HTMLElement
    expect(visibleScriptureListenRawText(scope, { omitVerseSup: true }).replace(/\s+/g, ' ').trim()).toBe(
      'In the beginning'
    )
    expect(plainTextForScriptureListen(scope, { omitVerseSup: true })).toBe('In the beginning')
  })

  it('visibleScriptureListenRawText inserts breaks between block siblings', () => {
    document.body.innerHTML =
      '<div id="scope"><p>First paragraph</p><p>Second paragraph</p></div>'
    const scope = document.getElementById('scope') as HTMLElement
    expect(visibleScriptureListenRawText(scope)).toBe('First paragraph\nSecond paragraph')
    expect(plainTextForScriptureListen(scope)).toBe('First paragraph Second paragraph')
  })

  it('SCRIPTURE_LISTEN_TEXT_OPTIONS omits verse sup for auto-scroll plain length', () => {
    document.body.innerHTML =
      '<div id="scope"><p><sup class="text-blue-600 font-medium">16</sup> For God so loved</p></div>'
    const scope = document.getElementById('scope') as HTMLElement
    const withVerseNumbers = plainTextForScriptureListen(scope).length
    const listenPlain = plainTextForScriptureListen(scope, SCRIPTURE_LISTEN_TEXT_OPTIONS).length
    expect(listenPlain).toBe('For God so loved'.length)
    expect(withVerseNumbers).toBeGreaterThan(listenPlain)
  })

  it('getScriptureListenCaretClientRect returns a rect for a valid plain offset', () => {
    document.body.innerHTML = '<div id="scope">For God so loved the world</div>'
    const scope = document.getElementById('scope') as HTMLElement
    const plain = plainTextForScriptureListen(scope)
    Range.prototype.getBoundingClientRect = jest.fn(() => ({
      top: 10,
      bottom: 24,
      left: 0,
      right: 40,
      width: 40,
      height: 14,
      x: 0,
      y: 10,
      toJSON: () => ({}),
    }))
    const rect = getScriptureListenCaretClientRect(scope, plain.length, 4)
    expect(rect).not.toBeNull()
    expect(rect!.width).toBe(40)
  })
})
