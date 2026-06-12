/**
 * @jest-environment jsdom
 */

import {
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
})
