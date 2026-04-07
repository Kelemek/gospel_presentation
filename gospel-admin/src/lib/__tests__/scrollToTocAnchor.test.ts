import { getSafeAreaInsetsPx, scrollToTocAnchor } from '../scrollToTocAnchor'

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
