/**
 * @jest-environment jsdom
 */

import { scrollToVersePinWhenReady } from '@/lib/scrollToVersePinWhenReady'
import * as scrollToTocAnchor from '@/lib/scrollToTocAnchor'

describe('scrollToVersePinWhenReady', () => {
  let whenReadySpy: jest.SpyInstance

  beforeEach(() => {
    document.body.innerHTML = ''
    window.scrollTo = jest.fn()
    whenReadySpy = jest.spyOn(scrollToTocAnchor, 'scrollToTocAnchorWhenReady')
  })

  afterEach(() => {
    whenReadySpy.mockRestore()
  })

  it('delegates to scrollToTocAnchorWhenReady and scrolls yellow card on done', () => {
    const cancel = jest.fn()
    whenReadySpy.mockImplementation(
      (_id: string, opts: { onDone?: () => void; onGiveUp?: () => void }) => {
        opts.onDone?.()
        return cancel
      }
    )

    const subsection = document.createElement('div')
    subsection.id = 'section-1-0'
    const card = document.createElement('div')
    card.setAttribute('data-scripture-pin-color', 'yellow')
    card.textContent = 'John 3:16'
    subsection.appendChild(card)
    document.body.appendChild(subsection)

    jest.spyOn(card, 'getBoundingClientRect').mockReturnValue({
      top: 80,
      left: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })
    Object.defineProperty(window, 'scrollY', { value: 50, writable: true })

    const header = document.createElement('div')
    header.setAttribute('data-profile-sticky-header', '')
    Object.defineProperty(header, 'offsetHeight', { value: 40, configurable: true })
    document.body.appendChild(header)

    const rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 1
    })

    const onDone = jest.fn()
    const returnedCancel = scrollToVersePinWhenReady(
      {
        subsectionId: 'section-1-0',
        sectionId: 'section-1',
        reference: 'John 3:16',
      },
      { behavior: 'smooth', onDone }
    )

    expect(whenReadySpy).toHaveBeenCalledWith(
      'section-1-0',
      expect.objectContaining({ behavior: 'smooth' })
    )
    expect(window.scrollTo).toHaveBeenCalled()
    expect(onDone).toHaveBeenCalled()
    expect(returnedCancel).toBe(cancel)

    rafSpy.mockRestore()
  })

  it('falls back to first yellow card when reference text does not match', () => {
    whenReadySpy.mockImplementation((_id: string, opts: { onDone?: () => void }) => {
      opts.onDone?.()
      return jest.fn()
    })

    const subsection = document.createElement('div')
    subsection.id = 'section-2-0'
    const first = document.createElement('div')
    first.setAttribute('data-scripture-pin-color', 'yellow')
    first.textContent = 'Romans 1:1'
    subsection.appendChild(first)
    document.body.appendChild(subsection)

    jest.spyOn(first, 'getBoundingClientRect').mockReturnValue({
      top: 10,
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

    scrollToVersePinWhenReady({
      subsectionId: 'section-2-0',
      sectionId: 'section-2',
      reference: 'No match',
    })

    expect(window.scrollTo).toHaveBeenCalled()
  })

  it('forwards onGiveUp from scrollToTocAnchorWhenReady', () => {
    whenReadySpy.mockImplementation((_id: string, opts: { onGiveUp?: () => void }) => {
      opts.onGiveUp?.()
      return jest.fn()
    })

    const onGiveUp = jest.fn()
    scrollToVersePinWhenReady(
      { subsectionId: 'missing', sectionId: 'missing', reference: 'x' },
      { onGiveUp }
    )

    expect(onGiveUp).toHaveBeenCalled()
  })
})
