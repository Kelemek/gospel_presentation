/**
 * @jest-environment jsdom
 */

import { visibleListenRawText } from '@/lib/profileResourceListenText'
import {
  advanceScriptureListenIntegratedPlaybackTime,
  clampReadAlongScrollDeltaToOneLineStep,
  computeReadAlongVerticalScrollDeltaForComfortZone,
  computeReadAlongWindowScrollDeltaToCenterCaret,
  computeScrollDeltaToAlignCaretTopToViewportY,
  isNewReadAlongVisualLine,
  readAlongCaretLineHeightPx,
  RESOURCE_LISTEN_CARET_CENTER_DEADBAND_PX,
  RESOURCE_LISTEN_CARET_LINE_TOP_TOLERANCE_PX,
  RESOURCE_LISTEN_CARET_MIN_LINE_HEIGHT_PX,
  computeScriptureListenProportionalScrollTop,
  applyReadAlongWindowScrollBy,
  applyReadAlongWindowScrollTop,
  readAlongListenScrollBehavior,
  scrollListenScopeIntoViewCenter,
  scriptureListenPlaybackFractionForScroll,
  computeScriptureListenTargetScrollTop,
  scrollReadAlongPlainInScrollContainerIfNeeded,
  walkerOffsetForReadAlongPlainOffset,
} from '@/lib/scrollReadAlongPlain'

describe('readAlongListenScrollBehavior', () => {
  it('returns instant so read-along does not use CSS-smooth scrolling', () => {
    expect(readAlongListenScrollBehavior()).toBe('instant')
  })
})

describe('applyReadAlongWindowScrollTop', () => {
  it('calls scrollTo with instant behavior', () => {
    const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => {})
    applyReadAlongWindowScrollTop(window, 240)
    expect(scrollTo).toHaveBeenCalledWith({
      top: 240,
      left: window.scrollX,
      behavior: 'instant',
    })
    scrollTo.mockRestore()
  })
})

describe('scrollListenScopeIntoViewCenter', () => {
  it('centers the scope in the viewport without scrollIntoView', () => {
    const scope = document.createElement('div')
    document.body.appendChild(scope)
    const scrollIntoView = jest.spyOn(scope, 'scrollIntoView')
    const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => {})
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 100 })
    scope.getBoundingClientRect = jest.fn(() => ({
      top: 400,
      bottom: 500,
      left: 0,
      right: 100,
      width: 100,
      height: 100,
      x: 0,
      y: 400,
      toJSON: () => ({}),
    }))
    scrollListenScopeIntoViewCenter(scope)
  // top 400 + scrollY 100; height 100; center → 400+100 - (800-100)/2 = 150
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 150, behavior: 'instant' }))
    expect(scrollIntoView).not.toHaveBeenCalled()
    scrollTo.mockRestore()
    scrollIntoView.mockRestore()
    scope.remove()
  })
})

describe('applyReadAlongWindowScrollBy', () => {
  it('applies delta via scrollTo', () => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 50 })
    const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => {})
    applyReadAlongWindowScrollBy(window, 30)
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 80, behavior: 'instant' }))
    scrollTo.mockRestore()
  })
})

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

describe('computeReadAlongWindowScrollDeltaToCenterCaret', () => {
  it('returns 0 when caret midline is already at the viewport center', () => {
    expect(
      computeReadAlongWindowScrollDeltaToCenterCaret(
        { top: 390, bottom: 410 },
        800,
        { targetFractionFromTop: 0.5, deadbandPx: 5 }
      )
    ).toBe(0)
  })

  it('returns positive delta when caret is below center', () => {
    expect(
      computeReadAlongWindowScrollDeltaToCenterCaret(
        { top: 590, bottom: 610 },
        800,
        { targetFractionFromTop: 0.5, deadbandPx: 0 }
      )
    ).toBe(200)
  })

  it('returns negative delta when caret is above center', () => {
    expect(
      computeReadAlongWindowScrollDeltaToCenterCaret(
        { top: 190, bottom: 210 },
        800,
        { targetFractionFromTop: 0.5, deadbandPx: 0 }
      )
    ).toBe(-200)
  })

  it('clamps each adjustment to one line height when maxScrollStepPx is set', () => {
    const caret = { top: 590, bottom: 612, height: 22 }
    expect(
      computeReadAlongWindowScrollDeltaToCenterCaret(caret, 800, {
        targetFractionFromTop: 0.5,
        deadbandPx: 0,
        maxScrollStepPx: readAlongCaretLineHeightPx(caret),
      })
    ).toBe(22)
  })

  it('uses minimum line height when caret height is zero', () => {
    expect(
      computeReadAlongWindowScrollDeltaToCenterCaret(
        { top: 590, bottom: 590, height: 0 },
        800,
        {
          targetFractionFromTop: 0.5,
          deadbandPx: 0,
          maxScrollStepPx: readAlongCaretLineHeightPx({ top: 590, bottom: 590, height: 0 }),
        }
      )
    ).toBe(RESOURCE_LISTEN_CARET_MIN_LINE_HEIGHT_PX)
  })
})

describe('isNewReadAlongVisualLine', () => {
  it('treats the first caret as a new line', () => {
    expect(isNewReadAlongVisualLine(300, null)).toBe(true)
  })

  it('returns false when caret top is within tolerance of the last line', () => {
    expect(isNewReadAlongVisualLine(302, 300, RESOURCE_LISTEN_CARET_LINE_TOP_TOLERANCE_PX)).toBe(
      false
    )
    expect(isNewReadAlongVisualLine(296, 300, RESOURCE_LISTEN_CARET_LINE_TOP_TOLERANCE_PX)).toBe(
      false
    )
  })

  it('returns true when caret top moved to another visual line', () => {
    expect(isNewReadAlongVisualLine(305, 300, RESOURCE_LISTEN_CARET_LINE_TOP_TOLERANCE_PX)).toBe(
      true
    )
    expect(isNewReadAlongVisualLine(280, 300, RESOURCE_LISTEN_CARET_LINE_TOP_TOLERANCE_PX)).toBe(
      true
    )
  })
})

describe('RESOURCE_LISTEN_CARET_CENTER_DEADBAND_PX', () => {
  it('uses a wide enough band to avoid jitter while still targeting center', () => {
    expect(RESOURCE_LISTEN_CARET_CENTER_DEADBAND_PX).toBeGreaterThanOrEqual(36)
    expect(RESOURCE_LISTEN_CARET_CENTER_DEADBAND_PX).toBeLessThanOrEqual(48)
  })
})

describe('clampReadAlongScrollDeltaToOneLineStep', () => {
  it('returns 0 for zero delta', () => {
    expect(clampReadAlongScrollDeltaToOneLineStep(0, 24)).toBe(0)
  })

  it('limits positive delta to one line step', () => {
    expect(clampReadAlongScrollDeltaToOneLineStep(200, 24)).toBe(24)
    expect(clampReadAlongScrollDeltaToOneLineStep(10, 24)).toBe(10)
  })

  it('limits negative delta to one line step', () => {
    expect(clampReadAlongScrollDeltaToOneLineStep(-200, 20)).toBe(-22)
  })

  it('readAlongCaretLineHeightPx enforces minimum fallback', () => {
    expect(readAlongCaretLineHeightPx({ top: 0, bottom: 0, height: 0 })).toBe(
      RESOURCE_LISTEN_CARET_MIN_LINE_HEIGHT_PX
    )
    expect(readAlongCaretLineHeightPx({ top: 10, bottom: 28, height: 18 })).toBe(
      RESOURCE_LISTEN_CARET_MIN_LINE_HEIGHT_PX
    )
    expect(readAlongCaretLineHeightPx({ top: 10, bottom: 36, height: 26 })).toBe(26)
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

describe('scriptureListenPlaybackFractionForScroll', () => {
  it('returns 0 before start delay elapses', () => {
    expect(scriptureListenPlaybackFractionForScroll(1.5, 10, 2)).toBe(0)
    expect(scriptureListenPlaybackFractionForScroll(2, 10, 2)).toBe(0)
  })

  it('ramps from 0 to 1 across the scrollable remainder of the track', () => {
    expect(scriptureListenPlaybackFractionForScroll(6, 10, 2)).toBe(0.5)
    expect(scriptureListenPlaybackFractionForScroll(10, 10, 2)).toBe(1)
  })

  it('returns 1 when delay consumes the full duration', () => {
    expect(scriptureListenPlaybackFractionForScroll(0, 5, 5)).toBe(1)
    expect(scriptureListenPlaybackFractionForScroll(0, 5, 6)).toBe(1)
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
