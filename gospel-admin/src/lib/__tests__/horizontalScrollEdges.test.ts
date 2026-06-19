import { getHorizontalScrollEdges } from '../horizontalScrollEdges'

describe('getHorizontalScrollEdges', () => {
  function mockScrollEl(scrollWidth: number, clientWidth: number, scrollLeft: number) {
    const el = document.createElement('div')
    Object.defineProperty(el, 'scrollWidth', { value: scrollWidth, configurable: true })
    Object.defineProperty(el, 'clientWidth', { value: clientWidth, configurable: true })
    Object.defineProperty(el, 'scrollLeft', { value: scrollLeft, writable: true, configurable: true })
    return el
  }

  it('hides fades when content fits', () => {
    expect(getHorizontalScrollEdges(mockScrollEl(200, 200, 0))).toEqual({
      canScroll: false,
      showStart: false,
      showEnd: false,
    })
  })

  it('shows end fade at scroll start', () => {
    expect(getHorizontalScrollEdges(mockScrollEl(400, 200, 0))).toEqual({
      canScroll: true,
      showStart: false,
      showEnd: true,
    })
  })

  it('shows start fade when scrolled near the end', () => {
    expect(getHorizontalScrollEdges(mockScrollEl(400, 200, 199))).toEqual({
      canScroll: true,
      showStart: true,
      showEnd: false,
    })
  })

  it('shows both fades in the middle', () => {
    expect(getHorizontalScrollEdges(mockScrollEl(500, 200, 150))).toEqual({
      canScroll: true,
      showStart: true,
      showEnd: true,
    })
  })
})
