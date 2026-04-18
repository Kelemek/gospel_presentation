import {
  applyProfileHelpTourPopoverSafeAreaNudge,
  getProfileHelpTourPopoverSafeInsets,
} from '@/lib/profileHelpTours'
import * as scrollToTocAnchor from '@/lib/scrollToTocAnchor'

describe('applyProfileHelpTourPopoverSafeAreaNudge', () => {
  let getSafeSpy: jest.SpyInstance
  const savedViewport: Array<{
    prop: 'innerWidth' | 'innerHeight'
    desc: PropertyDescriptor | undefined
  }> = []

  beforeEach(() => {
    document.body.innerHTML = ''
    getSafeSpy = jest.spyOn(scrollToTocAnchor, 'getSafeAreaInsetsPx')
  })

  afterEach(() => {
    getSafeSpy.mockRestore()
    while (savedViewport.length) {
      const { prop, desc } = savedViewport.pop()!
      if (desc) Object.defineProperty(window, prop, desc)
      else Reflect.deleteProperty(window, prop)
    }
  })

  function mockViewport(w: number, h: number): void {
    for (const [prop, value] of [
      ['innerWidth', w],
      ['innerHeight', h],
    ] as const) {
      savedViewport.push({ prop, desc: Object.getOwnPropertyDescriptor(window, prop) })
      Object.defineProperty(window, prop, { configurable: true, writable: true, value })
    }
  }

  it('boosts bottom inset on Android narrow when env() reports zero (matches JS used for nudge)', () => {
    const prevUa = navigator.userAgent
    const prevMm = window.matchMedia
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value:
        'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    })
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query.includes('767'),
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })) as typeof window.matchMedia
    getSafeSpy.mockReturnValue({ top: 0, right: 0, bottom: 0, left: 0 })
    try {
      expect(getProfileHelpTourPopoverSafeInsets().bottom).toBe(72)
    } finally {
      window.matchMedia = prevMm
      Object.defineProperty(navigator, 'userAgent', { configurable: true, value: prevUa })
    }
  })

  it('does not change the popover when safe-area insets are all zero', () => {
    getSafeSpy.mockReturnValue({ top: 0, right: 0, bottom: 0, left: 0 })
    const el = document.createElement('div')
    document.body.appendChild(el)
    el.style.transform = 'translateY(-2px)'
    jest.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      left: 0,
      right: 100,
      bottom: 100,
      width: 100,
      height: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })
    mockViewport(400, 800)

    applyProfileHelpTourPopoverSafeAreaNudge(el)
    expect(el.style.transform).toBe('translateY(-2px)')
  })

  it('appends translate when the popover extends past the safe bottom inset', () => {
    getSafeSpy.mockReturnValue({ top: 0, right: 0, bottom: 40, left: 0 })
    const el = document.createElement('div')
    document.body.appendChild(el)
    el.style.transform = 'translateY(-5px)'
    jest.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      top: 700,
      left: 50,
      right: 350,
      bottom: 780,
      width: 300,
      height: 80,
      x: 50,
      y: 700,
      toJSON: () => ({}),
    })
    mockViewport(400, 800)

    applyProfileHelpTourPopoverSafeAreaNudge(el)
    expect(el.style.transform).toContain('translateY(-5px)')
    // innerHeight 800 - bottom inset 40 => safe bottom 760; rect.bottom 780 => dy = -20
    expect(el.style.transform).toContain('translate(0px, -20px)')
  })

  it('uses a single horizontal delta when both left and right overflow (no += compounding)', () => {
    getSafeSpy.mockReturnValue({ top: 0, right: 50, bottom: 0, left: 50 })
    const el = document.createElement('div')
    document.body.appendChild(el)
    el.style.transform = ''
    // Safe x: [50, 350] (inner width 300). Popover 40–345 is 305px wide — cannot satisfy both edges; old += would use 10+5=15.
    jest.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      left: 40,
      right: 345,
      bottom: 200,
      width: 305,
      height: 100,
      x: 40,
      y: 100,
      toJSON: () => ({}),
    })
    mockViewport(400, 800)

    applyProfileHelpTourPopoverSafeAreaNudge(el)
    // deltaMin = 10, deltaMax = 5 → average (10+5)/2 = 7.5
    expect(el.style.transform).toContain('translate(7.5px, 0px)')
  })

  it('returns early without changing transform when already inside safe rect', () => {
    getSafeSpy.mockReturnValue({ top: 50, right: 0, bottom: 40, left: 0 })
    const el = document.createElement('div')
    document.body.appendChild(el)
    el.style.transform = 'translateY(-3px)'
    jest.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      left: 20,
      right: 320,
      bottom: 400,
      width: 300,
      height: 300,
      x: 20,
      y: 100,
      toJSON: () => ({}),
    })
    mockViewport(400, 800)

    applyProfileHelpTourPopoverSafeAreaNudge(el)
    expect(el.style.transform).toBe('translateY(-3px)')
  })
})
