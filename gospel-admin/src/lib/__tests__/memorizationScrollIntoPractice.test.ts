/**
 * @jest-environment jsdom
 */

import { scrollMemorizeBlankIntoPracticeColumn } from '@/lib/memorizationScrollIntoPractice'

describe('scrollMemorizeBlankIntoPracticeColumn', () => {
  it('sets scrollTop to center the element in the scroll parent', () => {
    const scrollEl = document.createElement('div')
    const el = document.createElement('span')
    document.body.appendChild(scrollEl)
    scrollEl.appendChild(el)
    scrollEl.getBoundingClientRect = jest.fn(() => ({
      top: 0,
      left: 0,
      bottom: 400,
      right: 200,
      width: 200,
      height: 400,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }))
    el.getBoundingClientRect = jest.fn(() => ({
      top: 200,
      left: 10,
      bottom: 220,
      right: 30,
      width: 20,
      height: 20,
      x: 10,
      y: 200,
      toJSON: () => ({}),
    }))
    Object.defineProperty(scrollEl, 'clientHeight', { value: 400, configurable: true })
    Object.defineProperty(scrollEl, 'scrollHeight', { value: 2000, configurable: true })
    scrollEl.scrollTop = 500

    scrollMemorizeBlankIntoPracticeColumn(scrollEl, el)

    // 200 - 0 + 500 = 700 offset; center: 700 - 200 + 10 = 510
    expect(scrollEl.scrollTop).toBe(510)
  })
})
