/**
 * @jest-environment jsdom
 */

import { visibleListenRawText } from '@/lib/profileResourceListenText'
import {
  computeReadAlongVerticalScrollDeltaForComfortZone,
  scrollReadAlongPlainInScrollContainerIfNeeded,
  walkerOffsetForReadAlongPlainOffset,
} from '@/lib/scrollReadAlongPlain'

describe('computeReadAlongVerticalScrollDeltaForComfortZone', () => {
  const topM = 100
  const botM = 88
  const vp = 800

  it('returns 0 when caret is fully inside the comfort zone', () => {
    expect(
      computeReadAlongVerticalScrollDeltaForComfortZone({ top: 120, bottom: 140 }, vp, topM, botM)
    ).toBe(0)
    expect(
      computeReadAlongVerticalScrollDeltaForComfortZone({ top: 400, bottom: 420 }, vp, topM, botM)
    ).toBe(0)
  })

  it('returns positive delta when caret extends below the zone', () => {
    const zoneBottom = vp - botM
    expect(
      computeReadAlongVerticalScrollDeltaForComfortZone(
        { top: zoneBottom - 10, bottom: zoneBottom + 40 },
        vp,
        topM,
        botM
      )
    ).toBe(40)
  })

  it('returns negative delta when caret is above the top margin', () => {
    expect(
      computeReadAlongVerticalScrollDeltaForComfortZone({ top: 40, bottom: 60 }, vp, topM, botM)
    ).toBe(40 - 100)
  })

  it('prioritizes bottom overflow when both edges would be violated', () => {
    const zoneBottom = vp - botM
    const delta = computeReadAlongVerticalScrollDeltaForComfortZone(
      { top: 10, bottom: zoneBottom + 50 },
      vp,
      topM,
      botM
    )
    expect(delta).toBe(50)
  })
})

describe('walkerOffsetForReadAlongPlainOffset', () => {
  it('inserts implicit breaks between block elements like innerText', () => {
    document.body.innerHTML = '<div id="scope"><p>hello</p><p>world</p></div>'
    const scope = document.getElementById('scope') as HTMLElement
    expect(visibleListenRawText(scope)).toBe('hello\nworld')
    const L = 'hello world'.length
    expect(walkerOffsetForReadAlongPlainOffset(scope, L, 6)).toBe(6)
  })

  it('returns raw length when plain offset is past the last collapsed character', () => {
    document.body.innerHTML = '<div id="scope">abcd</div>'
    const scope = document.getElementById('scope') as HTMLElement
    expect(walkerOffsetForReadAlongPlainOffset(scope, 4, 50)).toBe(4)
  })

  it('clamps offset at collapsed length', () => {
    document.body.innerHTML = '<div id="scope">ab</div>'
    const scope = document.getElementById('scope') as HTMLElement
    expect(walkerOffsetForReadAlongPlainOffset(scope, 2, 999)).toBe(2)
  })
})

describe('scrollReadAlongPlainInScrollContainerIfNeeded', () => {
  it('scrolls the container when caret is below the comfort zone', () => {
    const container = document.createElement('div')
    container.style.height = '200px'
    container.style.overflow = 'auto'
    document.body.appendChild(container)
    container.getBoundingClientRect = jest.fn(() => ({
      top: 100,
      bottom: 300,
      left: 0,
      right: 400,
      width: 400,
      height: 200,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    }))
    container.scrollBy = jest.fn()

    scrollReadAlongPlainInScrollContainerIfNeeded(container, { top: 280, bottom: 296 }, 'auto', 56, 56)
    expect(container.scrollBy).toHaveBeenCalledWith({ top: expect.any(Number), behavior: 'auto' })
  })

  it('does not scroll when caret is inside the comfort zone', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    container.getBoundingClientRect = jest.fn(() => ({
      top: 100,
      bottom: 500,
      left: 0,
      right: 400,
      width: 400,
      height: 400,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    }))
    container.scrollBy = jest.fn()

    scrollReadAlongPlainInScrollContainerIfNeeded(container, { top: 200, bottom: 220 }, 'auto', 56, 56)
    expect(container.scrollBy).not.toHaveBeenCalled()
  })
})
