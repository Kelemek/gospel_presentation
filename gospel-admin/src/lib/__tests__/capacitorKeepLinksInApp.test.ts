/**
 * @jest-environment jsdom
 */

import {
  exceedsCapacitorLinkTapMoveThreshold,
  isSameDocumentCapacitorInAppHref,
  resolveCapacitorInAppLinkFromEvent,
  shouldKeepCapacitorLinkInApp,
} from '@/lib/capacitorKeepLinksInApp'

describe('capacitorKeepLinksInApp', () => {
  const currentHref = 'https://cp-church.org/default'

  beforeEach(() => {
    window.history.replaceState({}, '', '/default')
  })

  it('shouldKeepCapacitorLinkInApp treats cp-church.org subdomains as same site', () => {
    const url = new URL('https://thegospelpresentation.cp-church.org/mchy')
    expect(shouldKeepCapacitorLinkInApp(url, currentHref)).toBe(true)
  })

  it('shouldKeepCapacitorLinkInApp rejects external hosts', () => {
    const url = new URL('https://example.com/privacy')
    expect(shouldKeepCapacitorLinkInApp(url, currentHref)).toBe(false)
  })

  it('shouldKeepCapacitorLinkInApp skips same-page hash unless interceptSamePageHash is set', () => {
    const url = new URL('https://cp-church.org/default#section-1')
    expect(shouldKeepCapacitorLinkInApp(url, currentHref)).toBe(false)
    expect(
      shouldKeepCapacitorLinkInApp(url, currentHref, { interceptSamePageHash: true })
    ).toBe(true)
  })

  it('isSameDocumentCapacitorInAppHref treats trailing-slash paths as the same document', () => {
    window.history.replaceState({}, '', '/default/')
    expect(isSameDocumentCapacitorInAppHref('/default#section-2', window.location.href)).toBe(
      true
    )
  })

  it('resolveCapacitorInAppLinkFromEvent returns href for same-site profile links', () => {
    const anchor = document.createElement('a')
    anchor.href = 'https://cp-church.org/mchy'
    const span = document.createElement('span')
    span.textContent = "M'Cheyne"
    anchor.appendChild(span)
    document.body.appendChild(anchor)

    const event = new MouseEvent('click', { bubbles: true })
    Object.defineProperty(event, 'target', { value: span })

    expect(resolveCapacitorInAppLinkFromEvent(event, currentHref)).toEqual({
      href: '/mchy',
      anchor,
    })

    document.body.removeChild(anchor)
  })

  it('exceedsCapacitorLinkTapMoveThreshold detects scroll-sized movement', () => {
    expect(exceedsCapacitorLinkTapMoveThreshold(0, 0, 0, 9)).toBe(false)
    expect(exceedsCapacitorLinkTapMoveThreshold(0, 0, 0, 11)).toBe(true)
    expect(exceedsCapacitorLinkTapMoveThreshold(0, 0, 20, 0)).toBe(true)
  })
})
