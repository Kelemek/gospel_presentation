/**
 * @jest-environment jsdom
 */

import {
  computeScriptureListenAutoScrollStartDelaySec,
  getScriptureListenCaretClientRect,
  getScriptureListenInterpolatedCaretClientRect,
  plainOffsetAfterVisibleLineCount,
  plainTextForScriptureListen,
  SCRIPTURE_LISTEN_TEXT_OPTIONS,
  visibleScriptureListenRawText,
} from '@/lib/scriptureListenPlainText'

function mockCaretTopsByPlainOffset(lineBreakOffsets: number[]) {
  Range.prototype.getBoundingClientRect = jest.fn(function (this: Range) {
    const offset =
      this.startContainer instanceof Text
        ? this.startOffset
        : 0
    let lineIndex = 0
    for (const breakAt of lineBreakOffsets) {
      if (offset >= breakAt) lineIndex += 1
    }
    const top = 10 + lineIndex * 20
    return {
      top,
      bottom: top + 14,
      left: 0,
      right: 40,
      width: 40,
      height: 14,
      x: 0,
      y: top,
      toJSON: () => ({}),
    }
  })
}

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

  it('plainOffsetAfterVisibleLineCount returns offset at end of the Nth visible line', () => {
    document.body.innerHTML = `<div id="scope">${'a'.repeat(90)}</div>`
    const scope = document.getElementById('scope') as HTMLElement
    const plainLen = plainTextForScriptureListen(scope).length
    mockCaretTopsByPlainOffset([30, 60])
    expect(plainOffsetAfterVisibleLineCount(scope, 2)).toBe(59)
    expect(plainOffsetAfterVisibleLineCount(scope, 1)).toBe(29)
    expect(plainOffsetAfterVisibleLineCount(scope, 99)).toBe(plainLen)
  })

  it('computeScriptureListenAutoScrollStartDelaySec scales with duration and line content', () => {
    document.body.innerHTML = `<div id="scope">${'word '.repeat(40)}</div>`
    const scope = document.getElementById('scope') as HTMLElement
    const plainLen = plainTextForScriptureListen(scope).length
    mockCaretTopsByPlainOffset([40, 80])
    const offsetLine2 = plainOffsetAfterVisibleLineCount(scope, 2)
    const uncapped = (100 * offsetLine2) / plainLen
    expect(computeScriptureListenAutoScrollStartDelaySec(scope, 100)).toBeCloseTo(
      Math.min(uncapped, 35)
    )
    expect(computeScriptureListenAutoScrollStartDelaySec(scope, 0.2)).toBe(0)
  })

  it('getScriptureListenInterpolatedCaretClientRect lerps between adjacent offsets', () => {
    document.body.innerHTML = '<div id="scope">For God so loved the world</div>'
    const scope = document.getElementById('scope') as HTMLElement
    const plainLen = plainTextForScriptureListen(scope).length
    let call = 0
    Range.prototype.getBoundingClientRect = jest.fn(() => {
      call += 1
      const top = call === 1 ? 10 : 30
      const bottom = call === 1 ? 24 : 44
      return {
        top,
        bottom,
        left: 0,
        right: 40,
        width: 40,
        height: bottom - top,
        x: 0,
        y: top,
        toJSON: () => ({}),
      }
    })
    const rect = getScriptureListenInterpolatedCaretClientRect(scope, plainLen, 4.5)
    expect(rect).not.toBeNull()
    expect(rect!.top).toBe(20)
    expect(rect!.bottom).toBe(34)
  })
})
