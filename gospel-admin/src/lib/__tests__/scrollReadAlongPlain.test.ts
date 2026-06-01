/**
 * @jest-environment jsdom
 */

import { visibleListenRawText } from '@/lib/profileResourceListenText'
import {
  advanceScriptureListenIntegratedPlaybackTime,
  computeReadAlongVerticalScrollDeltaForComfortZone,
  computeScrollDeltaToAlignCaretTopToViewportY,
  computeScriptureListenProportionalScrollTop,
  computeScriptureListenTargetScrollTop,
  scrollReadAlongPlainInScrollContainerIfNeeded,
  walkerOffsetForReadAlongPlainOffset,
} from '@/lib/scrollReadAlongPlain'

describe('computeScrollDeltaToAlignCaretTopToViewportY', () => {
  it('returns 0 inside deadband', () => {
    expect(computeScrollDeltaToAlignCaretTopToViewportY(104, 104)).toBe(0)
    expect(computeScrollDeltaToAlignCaretTopToViewportY(106, 104, 3)).toBe(0)
  })

  it('returns delta when caret is below target', () => {
    expect(computeScrollDeltaToAlignCaretTopToViewportY(200, 104)).toBe(96)
  })

  it('returns negative delta when caret is above target', () => {
    expect(computeScrollDeltaToAlignCaretTopToViewportY(50, 104)).toBe(-54)
  })
})

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
  function mockScrollContainer(rect: {
    top: number
    bottom: number
    height: number
    width?: number
  }) {
    const container = document.createElement('div')
    document.body.appendChild(container)
    Object.defineProperty(container, 'scrollTop', { configurable: true, writable: true, value: 0 })
    Object.defineProperty(container, 'scrollHeight', { configurable: true, value: 1000 })
    Object.defineProperty(container, 'clientHeight', { configurable: true, value: 400 })
    container.getBoundingClientRect = jest.fn(() => ({
      top: rect.top,
      bottom: rect.bottom,
      left: 0,
      right: rect.width ?? 400,
      width: rect.width ?? 400,
      height: rect.height,
      x: 0,
      y: rect.top,
      toJSON: () => ({}),
    }))
    container.scrollBy = jest.fn()
    return container
  }

  it('scrolls the container when caret is below the comfort zone', () => {
    const container = mockScrollContainer({ top: 100, bottom: 300, height: 200 })

    scrollReadAlongPlainInScrollContainerIfNeeded(
      container,
      { top: 280, bottom: 296 },
      'auto',
      { topMarginPx: 56, bottomMarginPx: 56 }
    )
    expect(container.scrollBy).toHaveBeenCalledWith({ top: expect.any(Number), behavior: 'auto' })
  })

  it('does not scroll when caret is inside the comfort zone', () => {
    const container = mockScrollContainer({ top: 100, bottom: 500, height: 400 })

    scrollReadAlongPlainInScrollContainerIfNeeded(
      container,
      { top: 200, bottom: 220 },
      'auto',
      { topMarginPx: 56, bottomMarginPx: 56 }
    )
    expect(container.scrollBy).not.toHaveBeenCalled()
  })

  it('with targetCaretFractionFromTop, scrolls caret toward upper portion of container', () => {
    const container = mockScrollContainer({ top: 200, bottom: 800, height: 600 })
    scrollReadAlongPlainInScrollContainerIfNeeded(
      container,
      { top: 490, bottom: 510 },
      'auto',
      { topMarginPx: 112, targetCaretFractionFromTop: 0.35, targetDeadbandPx: 8 }
    )
    expect(container.scrollBy).toHaveBeenCalledWith({ top: 90, behavior: 'auto' })
  })
})

describe('computeScriptureListenTargetScrollTop', () => {
  function mockContainer(opts: {
    scrollTop?: number
    scrollHeight?: number
    clientHeight?: number
    rect: { top: number; bottom: number; height: number }
  }) {
    const container = document.createElement('div')
    document.body.appendChild(container)
    Object.defineProperty(container, 'scrollTop', {
      configurable: true,
      writable: true,
      value: opts.scrollTop ?? 0,
    })
    Object.defineProperty(container, 'scrollHeight', {
      configurable: true,
      value: opts.scrollHeight ?? 1000,
    })
    Object.defineProperty(container, 'clientHeight', {
      configurable: true,
      value: opts.clientHeight ?? 400,
    })
    container.getBoundingClientRect = jest.fn(() => ({
      top: opts.rect.top,
      bottom: opts.rect.bottom,
      left: 0,
      right: 400,
      width: 400,
      height: opts.rect.height,
      x: 0,
      y: opts.rect.top,
      toJSON: () => ({}),
    }))
    return container
  }

  it('returns null when caret is within deadband', () => {
    const container = mockContainer({
      rect: { top: 200, bottom: 800, height: 600 },
    })
    // target at 200 + 600*0.35 = 410; caret mid 410 → within deadband
    expect(
      computeScriptureListenTargetScrollTop(
        container,
        { top: 400, bottom: 420 },
        { topMarginPx: 112, targetCaretFractionFromTop: 0.35, targetDeadbandPx: 28 }
      )
    ).toBeNull()
  })

  it('returns clamped target scrollTop when caret is below target line', () => {
    const container = mockContainer({
      scrollTop: 100,
      rect: { top: 200, bottom: 800, height: 600 },
    })
    // target Y = 410; caret mid 500 → delta 90 → target scrollTop 190
    expect(
      computeScriptureListenTargetScrollTop(
        container,
        { top: 490, bottom: 510 },
        { topMarginPx: 112, targetCaretFractionFromTop: 0.35, targetDeadbandPx: 8 }
      )
    ).toBe(190)
  })

  it('with continuous mode, scrolls for deltas inside the deadband', () => {
    const container = mockContainer({
      scrollTop: 100,
      rect: { top: 200, bottom: 800, height: 600 },
    })
    // caret mid 420; target Y 410 → delta 10 (inside deadband 28) but continuous still adjusts
    expect(
      computeScriptureListenTargetScrollTop(
        container,
        { top: 410, bottom: 430 },
        {
          topMarginPx: 112,
          targetCaretFractionFromTop: 0.35,
          targetDeadbandPx: 28,
          continuous: true,
        }
      )
    ).toBe(110)
  })

  it('returns null when already at max scroll even if caret is below target line', () => {
    const container = mockContainer({
      scrollTop: 600,
      scrollHeight: 1000,
      clientHeight: 400,
      rect: { top: 200, bottom: 800, height: 600 },
    })
    expect(
      computeScriptureListenTargetScrollTop(
        container,
        { top: 490, bottom: 510 },
        { topMarginPx: 112, targetCaretFractionFromTop: 0.35, targetDeadbandPx: 8 }
      )
    ).toBeNull()
  })
})

describe('computeScriptureListenProportionalScrollTop', () => {
  it('maps playback fraction to scrollTop through max scroll', () => {
    const container = document.createElement('div')
    Object.defineProperty(container, 'scrollHeight', { configurable: true, value: 1000 })
    Object.defineProperty(container, 'clientHeight', { configurable: true, value: 400 })
    expect(computeScriptureListenProportionalScrollTop(container, 0.5)).toBe(300)
    expect(computeScriptureListenProportionalScrollTop(container, 1.2)).toBe(600)
  })
})

describe('advanceScriptureListenIntegratedPlaybackTime', () => {
  it('advances by delta * playbackRate between rAF frames', () => {
    expect(advanceScriptureListenIntegratedPlaybackTime(2, 2, 10, 1, 0.016)).toBeCloseTo(2.016)
    expect(advanceScriptureListenIntegratedPlaybackTime(2, 2, 10, 1, 1)).toBe(3)
  })

  it('snaps to audio currentTime after a seek forward', () => {
    expect(advanceScriptureListenIntegratedPlaybackTime(2, 7, 10, 1, 0.016)).toBe(7)
  })

  it('snaps to audio currentTime after a seek backward', () => {
    expect(advanceScriptureListenIntegratedPlaybackTime(7, 2, 10, 1, 0.016)).toBe(2)
  })
})
