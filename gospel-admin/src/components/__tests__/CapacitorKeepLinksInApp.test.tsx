import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { CapacitorKeepLinksInApp } from '../CapacitorKeepLinksInApp'
import { scrollToTocAnchor } from '@/lib/scrollToTocAnchor'

const mockPush = jest.fn()
const mockReplace = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}))

jest.mock('@/lib/scrollToTocAnchor', () => ({
  scrollToTocAnchor: jest.fn(() => true),
}))

jest.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
}))

describe('CapacitorKeepLinksInApp', () => {
  beforeEach(() => {
    mockPush.mockClear()
    mockReplace.mockClear()
    ;(scrollToTocAnchor as jest.Mock).mockClear()
  })

  it('renders nothing (null)', () => {
    const { container } = render(<CapacitorKeepLinksInApp />)
    expect(container.firstChild).toBeNull()
  })

  it('does not intercept links when not on native platform', () => {
    const { unmount } = render(<CapacitorKeepLinksInApp />)
    const anchor = document.createElement('a')
    anchor.href = `${window.location.origin}/privacy`
    anchor.textContent = 'Privacy'
    document.body.appendChild(anchor)

    fireEvent.click(anchor, { bubbles: true })

    expect(mockPush).not.toHaveBeenCalled()
    document.body.removeChild(anchor)
    unmount()
  })

  describe('when on Capacitor native platform', () => {
    beforeEach(() => {
      const Capacitor = require('@capacitor/core').Capacitor
      Capacitor.isNativePlatform = () => true
    })

    afterEach(() => {
      const Capacitor = require('@capacitor/core').Capacitor
      Capacitor.isNativePlatform = () => false
    })

    it('intercepts same-origin /privacy link and calls router.push', () => {
      const { unmount } = render(<CapacitorKeepLinksInApp />)
      const anchor = document.createElement('a')
      anchor.href = `${window.location.origin}/privacy`
      anchor.textContent = 'Privacy'
      document.body.appendChild(anchor)

      const ev = new MouseEvent('click', { bubbles: true, cancelable: true })
      const preventDefaultSpy = jest.spyOn(ev, 'preventDefault')
      const stopPropagationSpy = jest.spyOn(ev, 'stopPropagation')
      anchor.dispatchEvent(ev)

      expect(preventDefaultSpy).toHaveBeenCalled()
      expect(stopPropagationSpy).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/privacy', { scroll: false })

      document.body.removeChild(anchor)
      unmount()
    })

    it('intercepts same-origin /copyright link and calls router.push', () => {
      const { unmount } = render(<CapacitorKeepLinksInApp />)
      const anchor = document.createElement('a')
      anchor.href = `${window.location.origin}/copyright`
      anchor.textContent = 'Copyright'
      document.body.appendChild(anchor)

      fireEvent.click(anchor, { bubbles: true })

      expect(mockPush).toHaveBeenCalledWith('/copyright', { scroll: false })
      document.body.removeChild(anchor)
      unmount()
    })

    it('intercepts same-origin profile/resource links such as /mchy', () => {
      const { unmount } = render(<CapacitorKeepLinksInApp />)
      const anchor = document.createElement('a')
      anchor.href = `${window.location.origin}/mchy`
      anchor.textContent = "M'Cheyne"
      document.body.appendChild(anchor)

      fireEvent.click(anchor, { bubbles: true })

      expect(mockPush).toHaveBeenCalledWith('/mchy', { scroll: false })
      document.body.removeChild(anchor)
      unmount()
    })

    it('intercepts same-origin home link', () => {
      const { unmount } = render(<CapacitorKeepLinksInApp />)
      const anchor = document.createElement('a')
      anchor.href = `${window.location.origin}/`
      anchor.textContent = 'Home'
      document.body.appendChild(anchor)

      fireEvent.click(anchor, { bubbles: true })

      expect(mockPush).toHaveBeenCalledWith('/', { scroll: false })
      document.body.removeChild(anchor)
      unmount()
    })

    it('intercepts same-page hash anchor and scrolls in-app on native', () => {
      const { unmount } = render(<CapacitorKeepLinksInApp />)
      const anchor = document.createElement('a')
      anchor.href = `${window.location.origin}${window.location.pathname}#section-1`
      anchor.textContent = 'Section'
      document.body.appendChild(anchor)

      fireEvent.click(anchor, { bubbles: true })

      expect(mockPush).not.toHaveBeenCalled()
      expect(scrollToTocAnchor).toHaveBeenCalledWith('section-1', { behavior: 'auto' })
      expect(mockReplace).toHaveBeenCalledWith(
        `${window.location.pathname}#section-1`,
        { scroll: false }
      )
      document.body.removeChild(anchor)
      unmount()
    })

    it('intercepts same-page hash anchor on touch tap', () => {
      const { unmount } = render(<CapacitorKeepLinksInApp />)
      const anchor = document.createElement('a')
      anchor.href = `${window.location.origin}${window.location.pathname}#section-5`
      anchor.textContent = 'Topic'
      document.body.appendChild(anchor)

      fireEvent.touchStart(anchor, { touches: [{ clientX: 0, clientY: 0 }] })
      fireEvent.touchEnd(anchor, { changedTouches: [{ clientX: 0, clientY: 0 }] })

      expect(scrollToTocAnchor).toHaveBeenCalledWith('section-5', { behavior: 'auto' })
      expect(mockReplace).toHaveBeenCalledWith(
        `${window.location.pathname}#section-5`,
        { scroll: false }
      )
      document.body.removeChild(anchor)
      unmount()
    })

    it('does not intercept external link', () => {
      const { unmount } = render(<CapacitorKeepLinksInApp />)
      const anchor = document.createElement('a')
      anchor.href = 'https://example.com/privacy'
      anchor.textContent = 'External'
      document.body.appendChild(anchor)

      fireEvent.click(anchor, { bubbles: true })

      expect(mockPush).not.toHaveBeenCalled()
      document.body.removeChild(anchor)
      unmount()
    })

    it('does not intercept click when target is not a link', () => {
      const { unmount } = render(<CapacitorKeepLinksInApp />)
      const div = document.createElement('div')
      div.textContent = 'Not a link'
      document.body.appendChild(div)

      fireEvent.click(div, { bubbles: true })

      expect(mockPush).not.toHaveBeenCalled()
      document.body.removeChild(div)
      unmount()
    })

    it('intercepts click on child of link (closest("a"))', () => {
      const { unmount } = render(<CapacitorKeepLinksInApp />)
      const anchor = document.createElement('a')
      anchor.href = `${window.location.origin}/privacy`
      const span = document.createElement('span')
      span.textContent = 'Privacy policy'
      anchor.appendChild(span)
      document.body.appendChild(anchor)

      fireEvent.click(span, { bubbles: true })

      expect(mockPush).toHaveBeenCalledWith('/privacy', { scroll: false })
      document.body.removeChild(anchor)
      unmount()
    })

    it('intercepts touch tap (touchstart + touchend) before native navigation on iOS-style taps', () => {
      const { unmount } = render(<CapacitorKeepLinksInApp />)
      const anchor = document.createElement('a')
      anchor.href = `${window.location.origin}/mchy`
      anchor.textContent = "M'Cheyne"
      document.body.appendChild(anchor)

      fireEvent.touchStart(anchor, { touches: [{ clientX: 0, clientY: 0 }] })
      expect(mockPush).not.toHaveBeenCalled()

      fireEvent.touchEnd(anchor, { changedTouches: [{ clientX: 0, clientY: 0 }] })
      expect(mockPush).toHaveBeenCalledWith('/mchy', { scroll: false })

      fireEvent.click(anchor, { bubbles: true })
      expect(mockPush).toHaveBeenCalledTimes(1)

      document.body.removeChild(anchor)
      unmount()
    })

    it('does not navigate when the finger moves before touchend (scroll)', () => {
      const { unmount } = render(<CapacitorKeepLinksInApp />)
      const anchor = document.createElement('a')
      anchor.href = `${window.location.origin}/mchy`
      anchor.textContent = "M'Cheyne"
      document.body.appendChild(anchor)

      fireEvent.touchStart(anchor, { touches: [{ clientX: 0, clientY: 0 }] })
      fireEvent.touchMove(anchor, { touches: [{ clientX: 0, clientY: 24 }] })
      fireEvent.touchEnd(anchor, { changedTouches: [{ clientX: 0, clientY: 24 }] })

      expect(mockPush).not.toHaveBeenCalled()

      document.body.removeChild(anchor)
      unmount()
    })

    it('removes listeners on unmount so remount does not stack handlers', () => {
      const anchor = document.createElement('a')
      anchor.href = `${window.location.origin}/mchy`
      anchor.textContent = "M'Cheyne"
      document.body.appendChild(anchor)

      const first = render(<CapacitorKeepLinksInApp />)
      fireEvent.touchStart(anchor, { touches: [{ clientX: 0, clientY: 0 }] })
      fireEvent.touchEnd(anchor, { changedTouches: [{ clientX: 0, clientY: 0 }] })
      expect(mockPush).toHaveBeenCalledTimes(1)
      first.unmount()

      const second = render(<CapacitorKeepLinksInApp />)
      fireEvent.touchStart(anchor, { touches: [{ clientX: 0, clientY: 0 }] })
      fireEvent.touchEnd(anchor, { changedTouches: [{ clientX: 0, clientY: 0 }] })
      expect(mockPush).toHaveBeenCalledTimes(2)

      document.body.removeChild(anchor)
      second.unmount()
    })

    it('still navigates when a different link is clicked soon after a touch', () => {
      const { unmount } = render(<CapacitorKeepLinksInApp />)
      const first = document.createElement('a')
      first.href = `${window.location.origin}/mchy`
      first.textContent = "M'Cheyne"
      const second = document.createElement('a')
      second.href = `${window.location.origin}/privacy`
      second.textContent = 'Privacy'
      document.body.appendChild(first)
      document.body.appendChild(second)

      fireEvent.touchStart(first, { touches: [{ clientX: 0, clientY: 0 }] })
      fireEvent.touchEnd(first, { changedTouches: [{ clientX: 0, clientY: 0 }] })
      expect(mockPush).toHaveBeenCalledWith('/mchy', { scroll: false })

      fireEvent.click(second, { bubbles: true })
      expect(mockPush).toHaveBeenCalledWith('/privacy', { scroll: false })
      expect(mockPush).toHaveBeenCalledTimes(2)

      document.body.removeChild(first)
      document.body.removeChild(second)
      unmount()
    })
  })
})
