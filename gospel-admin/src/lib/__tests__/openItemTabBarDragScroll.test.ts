import {
  attachOpenItemTabBarDragScroll,
  clampOpenItemTabBarScrollLeft,
  OPEN_ITEM_TAB_BAR_DRAG_THRESHOLD_PX,
  scrollLeftForOpenItemTabBarDrag,
  shouldOpenItemTabBarDrag,
} from '../openItemTabBarDragScroll'

describe('openItemTabBarDragScroll', () => {
  it('shouldOpenItemTabBarDrag respects threshold and overflow', () => {
    const el = document.createElement('div')
    Object.defineProperty(el, 'scrollWidth', { value: 400, configurable: true })
    Object.defineProperty(el, 'clientWidth', { value: 200, configurable: true })

    const session = {
      pointerId: 1,
      startClientX: 100,
      startScrollLeft: 20,
      dragging: false,
    }

    expect(
      shouldOpenItemTabBarDrag(el, session, 100 + OPEN_ITEM_TAB_BAR_DRAG_THRESHOLD_PX - 1)
    ).toBe(false)
    expect(
      shouldOpenItemTabBarDrag(el, session, 100 + OPEN_ITEM_TAB_BAR_DRAG_THRESHOLD_PX)
    ).toBe(true)
  })

  it('scrollLeftForOpenItemTabBarDrag and clampOpenItemTabBarScrollLeft', () => {
    const el = document.createElement('div')
    Object.defineProperty(el, 'scrollWidth', { value: 400, configurable: true })
    Object.defineProperty(el, 'clientWidth', { value: 200, configurable: true })

    const session = {
      pointerId: 1,
      startClientX: 100,
      startScrollLeft: 50,
      dragging: true,
    }
    // Dragging right (+20px) increases scrollLeft: 50 + (120 - 100) = 70
    expect(scrollLeftForOpenItemTabBarDrag(session, 120)).toBe(70)
    expect(clampOpenItemTabBarScrollLeft(el, 999)).toBe(200)
    expect(clampOpenItemTabBarScrollLeft(el, -5)).toBe(0)
  })

  it('attachOpenItemTabBarDragScroll suppresses click after drag but not after small move', () => {
    const el = document.createElement('div')
    Object.defineProperty(el, 'scrollWidth', { value: 500, configurable: true })
    Object.defineProperty(el, 'clientWidth', { value: 200, configurable: true })
    let scrollLeft = 0
    Object.defineProperty(el, 'scrollLeft', {
      get: () => scrollLeft,
      set: (value: number) => {
        scrollLeft = value
      },
      configurable: true,
    })

    const button = document.createElement('button')
    el.appendChild(button)
    document.body.appendChild(el)

    const onClick = jest.fn()
    button.addEventListener('click', onClick)

    const detach = attachOpenItemTabBarDragScroll(el)

    try {
      el.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          clientX: 100,
          pointerId: 1,
          pointerType: 'mouse',
          button: 0,
          buttons: 1,
        })
      )
      window.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          cancelable: true,
          clientX: 140,
          pointerId: 1,
          pointerType: 'mouse',
          buttons: 1,
        })
      )
      window.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          cancelable: true,
          clientX: 140,
          pointerId: 1,
          pointerType: 'mouse',
          buttons: 0,
        })
      )
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      expect(onClick).not.toHaveBeenCalled()
      expect(scrollLeft).toBe(40)

      onClick.mockClear()
      scrollLeft = 0

      el.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          clientX: 50,
          pointerId: 2,
          pointerType: 'mouse',
          button: 0,
          buttons: 1,
        })
      )
      window.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          cancelable: true,
          clientX: 52,
          pointerId: 2,
          pointerType: 'mouse',
          buttons: 1,
        })
      )
      window.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          cancelable: true,
          clientX: 52,
          pointerId: 2,
          pointerType: 'mouse',
          buttons: 0,
        })
      )
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      expect(onClick).toHaveBeenCalledTimes(1)
    } finally {
      detach()
      el.remove()
    }
  })

  it('ignores touch pointerdown when mouseOnly is true', () => {
    const el = document.createElement('div')
    Object.defineProperty(el, 'scrollWidth', { value: 500, configurable: true })
    Object.defineProperty(el, 'clientWidth', { value: 200, configurable: true })
    let scrollLeft = 0
    Object.defineProperty(el, 'scrollLeft', {
      get: () => scrollLeft,
      set: (value: number) => {
        scrollLeft = value
      },
      configurable: true,
    })
    document.body.appendChild(el)
    const detach = attachOpenItemTabBarDragScroll(el)

    try {
      el.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          clientX: 100,
          pointerId: 3,
          pointerType: 'touch',
          button: 0,
          buttons: 1,
        })
      )
      window.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          clientX: 200,
          pointerId: 3,
          pointerType: 'touch',
          buttons: 1,
        })
      )
      expect(scrollLeft).toBe(0)
    } finally {
      detach()
      el.remove()
    }
  })
})
