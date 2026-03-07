import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { CapacitorKeepLinksInApp } from '../CapacitorKeepLinksInApp'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

jest.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
}))

describe('CapacitorKeepLinksInApp', () => {
  beforeEach(() => {
    mockPush.mockClear()
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
      expect(mockPush).toHaveBeenCalledWith('/privacy')

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

      expect(mockPush).toHaveBeenCalledWith('/copyright')
      document.body.removeChild(anchor)
      unmount()
    })

    it('does not intercept same-origin link to other path', () => {
      const { unmount } = render(<CapacitorKeepLinksInApp />)
      const anchor = document.createElement('a')
      anchor.href = `${window.location.origin}/`
      anchor.textContent = 'Home'
      document.body.appendChild(anchor)

      fireEvent.click(anchor, { bubbles: true })

      expect(mockPush).not.toHaveBeenCalled()
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

      expect(mockPush).toHaveBeenCalledWith('/privacy')
      document.body.removeChild(anchor)
      unmount()
    })
  })
})
