import {
  animateOverflowRevealTranslate,
  easeInOutCubic,
  measureOverflowRevealPx,
  playOverflowTextReveal,
  setOverflowRevealTranslate,
} from '../overflowTextRevealAnimation'

describe('overflowTextRevealAnimation', () => {
  it('measures clipped overflow', () => {
    const container = document.createElement('span')
    const text = document.createElement('span')
    Object.defineProperty(container, 'clientWidth', { value: 80, configurable: true })
    Object.defineProperty(text, 'scrollWidth', { value: 140, configurable: true })
    expect(measureOverflowRevealPx(container, text)).toBe(60)
  })

  it('eases in and out', () => {
    expect(easeInOutCubic(0)).toBe(0)
    expect(easeInOutCubic(1)).toBe(1)
    expect(easeInOutCubic(0.5)).toBe(0.5)
  })

  it('animates translate and resets when distance is zero', () => {
    const text = document.createElement('span')
    setOverflowRevealTranslate(text, 0)
    expect(text.style.transform).toBe('')

    setOverflowRevealTranslate(text, 24)
    expect(text.style.transform).toBe('translateX(-24px)')
  })

  it('plays reveal sequence when text overflows', async () => {
    jest.useFakeTimers()
    const rafCallbacks: FrameRequestCallback[] = []
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallbacks.push(cb)
      return rafCallbacks.length
    })

    const container = document.createElement('span')
    const text = document.createElement('span')
    Object.defineProperty(container, 'clientWidth', { value: 50, configurable: true })
    Object.defineProperty(text, 'scrollWidth', { value: 100, configurable: true })

    const signal = new AbortController().signal
    const promise = playOverflowTextReveal(container, text, signal, {
      pauseStartMs: 10,
      pauseEndMs: 10,
      minScrollMs: 20,
      maxScrollMs: 20,
      returnScrollMs: 20,
    })

    await jest.advanceTimersByTimeAsync(10)
    rafCallbacks.splice(0).forEach((cb) => cb(performance.now()))
    await jest.advanceTimersByTimeAsync(20)
    rafCallbacks.splice(0).forEach((cb) => cb(performance.now() + 20))
    await jest.advanceTimersByTimeAsync(10)
    rafCallbacks.splice(0).forEach((cb) => cb(performance.now() + 40))
    await jest.advanceTimersByTimeAsync(20)
    await promise

    expect(text.style.transform).toBe('')
    jest.useRealTimers()
  })

  it('aborts in-flight animation', async () => {
    const text = document.createElement('span')
    const controller = new AbortController()
    const promise = animateOverflowRevealTranslate(text, 0, 40, 1000, controller.signal)
    controller.abort()
    await promise
    expect(text.style.transform).toBe('translateX(-40px)')
  })
})
