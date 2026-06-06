import {
  applyStickyHeaderVisualViewportTop,
  getSafeAreaInsetsPx,
  scrollToTocAnchor,
  scrollToTocAnchorWhenReady,
  STICKY_HEADER_KEYBOARD_OFFSET_VAR,
} from '../scrollToTocAnchor'

describe('applyStickyHeaderVisualViewportTop', () => {
  const offsetVar = STICKY_HEADER_KEYBOARD_OFFSET_VAR

  it('pins the header to the rounded visual viewport offset (keyboard open on iOS)', () => {
    const header = document.createElement('div')
    const applied = applyStickyHeaderVisualViewportTop(header, { offsetTop: 137.6 })
    expect(applied).toBe(138)
    expect(header.style.getPropertyValue(offsetVar)).toBe('138px')
  })

  it('falls back to zero offset when there is no offset or viewport', () => {
    const header = document.createElement('div')
    expect(applyStickyHeaderVisualViewportTop(header, { offsetTop: 0 })).toBe(0)
    expect(header.style.getPropertyValue(offsetVar)).toBe('0px')

    const header2 = document.createElement('div')
    expect(applyStickyHeaderVisualViewportTop(header2, null)).toBe(0)
    expect(header2.style.getPropertyValue(offsetVar)).toBe('0px')
  })

  it('clamps negative offsets to zero (rubber-band overscroll)', () => {
    const header = document.createElement('div')
    expect(applyStickyHeaderVisualViewportTop(header, { offsetTop: -42 })).toBe(0)
    expect(header.style.getPropertyValue(offsetVar)).toBe('0px')
  })
})

describe('scrollToTocAnchor', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    window.scrollTo = jest.fn()
  })

  it('returns false when element missing', () => {
    expect(scrollToTocAnchor('missing')).toBe(false)
    expect(window.scrollTo).not.toHaveBeenCalled()
  })

  it('scrolls to subsection title when preferSubsectionTitle is set', () => {
    const container = document.createElement('div')
    container.id = 'section-1-0'
    const title = document.createElement('h4')
    title.className = 'print-subsection-title'
    container.appendChild(title)
    document.body.appendChild(container)
    jest.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      top: 400,
      left: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })
    jest.spyOn(title, 'getBoundingClientRect').mockReturnValue({
      top: 120,
      left: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })
    Object.defineProperty(window, 'scrollY', { value: 100, writable: true })

    const header = document.createElement('div')
    header.setAttribute('data-profile-sticky-header', '')
    document.body.appendChild(header)
    jest.spyOn(header, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 64,
      left: 0,
      right: 0,
      width: 0,
      height: 64,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    const result = scrollToTocAnchor('section-1-0', { behavior: 'auto', preferSubsectionTitle: true })
    expect(result).toBe(true)
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 120 + 100 - 64 - 8,
      behavior: 'auto',
    })
  })

  it('scrolls when element exists', () => {
    const el = document.createElement('div')
    el.id = 'section-1-0'
    document.body.appendChild(el)
    jest.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      top: 400,
      left: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })
    Object.defineProperty(window, 'scrollY', { value: 100, writable: true })

    const header = document.createElement('div')
    header.setAttribute('data-profile-sticky-header', '')
    document.body.appendChild(header)
    jest.spyOn(header, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 64,
      left: 0,
      right: 0,
      width: 0,
      height: 64,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    const result = scrollToTocAnchor('section-1-0', { behavior: 'auto' })
    expect(result).toBe(true)
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 400 + 100 - 64,
      behavior: 'auto',
    })
  })
})

describe('scrollToTocAnchorWhenReady', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    window.scrollTo = jest.fn()
  })

  it('retries until the anchor element exists', () => {
    const rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1)
    const cancelSpy = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

    const cancel = scrollToTocAnchorWhenReady('section-2-0', { behavior: 'auto', maxFrames: 5 })
    expect(window.scrollTo).not.toHaveBeenCalled()

    const target = document.createElement('div')
    target.id = 'section-2-0'
    document.body.appendChild(target)
    jest.spyOn(target, 'getBoundingClientRect').mockReturnValue({
      top: 200,
      left: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true })

    const firstRaf = rafSpy.mock.calls[0]?.[0] as FrameRequestCallback
    firstRaf(0)
    expect(window.scrollTo).toHaveBeenCalled()

    cancel()
    expect(cancelSpy).toHaveBeenCalledWith(1)

    rafSpy.mockRestore()
    cancelSpy.mockRestore()
  })
})

describe('getSafeAreaInsetsPx', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('reads padding from computed style on a probe element', () => {
    const original = window.getComputedStyle
    window.getComputedStyle = jest.fn(() => ({
      paddingTop: '47px',
      paddingRight: '0px',
      paddingBottom: '34px',
      paddingLeft: '0px',
    })) as unknown as typeof window.getComputedStyle
    try {
      const r = getSafeAreaInsetsPx()
      expect(r).toEqual({ top: 47, right: 0, bottom: 34, left: 0 })
      expect(document.body.querySelector('div')).toBeNull()
    } finally {
      window.getComputedStyle = original
    }
  })
})
