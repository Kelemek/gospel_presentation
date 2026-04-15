/**
 * @jest-environment jsdom
 */

import {
  scrollMemorizeBlankIntoPracticeColumn,
  scrollMemorizeBlankNearestInPracticeColumn,
} from '@/lib/memorizationScrollIntoPractice'

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

describe('scrollMemorizeBlankNearestInPracticeColumn', () => {
  it('does not change scroll when the blank is already fully visible', () => {
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
      top: 50,
      left: 10,
      bottom: 70,
      right: 30,
      width: 20,
      height: 20,
      x: 10,
      y: 50,
      toJSON: () => ({}),
    }))
    Object.defineProperty(scrollEl, 'clientHeight', { value: 400, configurable: true })
    Object.defineProperty(scrollEl, 'scrollHeight', { value: 2000, configurable: true })
    scrollEl.scrollTop = 100

    scrollMemorizeBlankNearestInPracticeColumn(scrollEl, el)

    expect(scrollEl.scrollTop).toBe(100)
  })

  it('scrolls down when the blank extends below the visible bottom', () => {
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
      top: 390,
      left: 10,
      bottom: 420,
      right: 30,
      width: 20,
      height: 30,
      x: 10,
      y: 390,
      toJSON: () => ({}),
    }))
    Object.defineProperty(scrollEl, 'clientHeight', { value: 400, configurable: true })
    Object.defineProperty(scrollEl, 'scrollHeight', { value: 2000, configurable: true })
    scrollEl.scrollTop = 0

    scrollMemorizeBlankNearestInPracticeColumn(scrollEl, el)

    // 420 > 392 → + (420 - 400 + 8) = 28
    expect(scrollEl.scrollTop).toBe(28)
  })
})
