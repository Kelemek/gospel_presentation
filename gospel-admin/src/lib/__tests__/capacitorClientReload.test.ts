/**
 * @jest-environment jsdom
 */

jest.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
}))

import {
  buildCapacitorHardReloadHref,
  CAPACITOR_ALLOW_FULL_NAVIGATION_ATTR,
  CAPACITOR_DEPLOY_RELOAD_QUERY,
  hardReloadCapacitorWebViewInApp,
  isCapacitorFullNavigationAnchor,
  reloadCapacitorWebViewInApp,
} from '@/lib/capacitorClientReload'

describe('capacitorClientReload', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/mchy?planDay=3#section-1')
  })

  it('buildCapacitorHardReloadHref preserves path, hash, and adds deploy query', () => {
    expect(buildCapacitorHardReloadHref('deploy-abc')).toBe(
      `/mchy?planDay=3&${CAPACITOR_DEPLOY_RELOAD_QUERY}=deploy-abc#section-1`
    )
  })

  it('isCapacitorFullNavigationAnchor detects deploy reload links', () => {
    const anchor = document.createElement('a')
    expect(isCapacitorFullNavigationAnchor(anchor)).toBe(false)
    anchor.setAttribute(CAPACITOR_ALLOW_FULL_NAVIGATION_ATTR, 'true')
    expect(isCapacitorFullNavigationAnchor(anchor)).toBe(true)
  })

  it('hardReloadCapacitorWebViewInApp clicks a marked same-origin anchor', () => {
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    expect(hardReloadCapacitorWebViewInApp('deploy-new')).toBe(true)
    expect(click).toHaveBeenCalled()
    const anchor = click.mock.instances[0] as HTMLAnchorElement
    expect(anchor.getAttribute(CAPACITOR_ALLOW_FULL_NAVIGATION_ATTR)).toBe('true')
    expect(anchor.getAttribute('href')).toContain(CAPACITOR_DEPLOY_RELOAD_QUERY)
    click.mockRestore()
  })

  it('reloadCapacitorWebViewInApp delegates to hard reload', () => {
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    expect(reloadCapacitorWebViewInApp('deploy-x')).toBe(true)
    expect(click).toHaveBeenCalled()
    click.mockRestore()
  })
})
