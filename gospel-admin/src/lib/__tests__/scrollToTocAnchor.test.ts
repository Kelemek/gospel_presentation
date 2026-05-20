import {
  getSafeAreaInsetsPx,
  scrollToTocAnchor,
  scrollToTocAnchorWhenReady,
} from '../scrollToTocAnchor'

describe('scrollToTocAnchor', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    window.scrollTo = jest.fn()
  })

  it('returns false when element missing', () => {
    expect(scrollToTocAnchor('missing')).toBe(false)
    expect(window.scrollTo).not.toHaveBeenCalled()
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
    Object.defineProperty(header, 'offsetHeight', { value: 64, configurable: true })
    document.body.appendChild(header)

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
