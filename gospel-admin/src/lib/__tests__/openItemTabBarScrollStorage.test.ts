import {
  clampTabBarScrollLeft,
  loadOpenItemTabBarScrollLeft,
  persistOpenItemTabBarScrollOnRelease,
  PROFILE_RESOURCE_TAB_BAR_SCROLL_KEY,
  restoreOpenItemTabBarScrollPosition,
  saveOpenItemTabBarScrollLeft,
} from '@/lib/openItemTabBarScrollStorage'
import { installTestSessionStorage } from '@/lib/testing/testLocalStorage'

describe('openItemTabBarScrollStorage', () => {
  beforeEach(() => {
    installTestSessionStorage()
    window.sessionStorage.clear()
  })

  it('saves and loads scrollLeft', () => {
    saveOpenItemTabBarScrollLeft(PROFILE_RESOURCE_TAB_BAR_SCROLL_KEY, 120)
    expect(loadOpenItemTabBarScrollLeft(PROFILE_RESOURCE_TAB_BAR_SCROLL_KEY)).toBe(120)
  })

  it('persistOpenItemTabBarScrollOnRelease does not overwrite with 0 after route teardown', () => {
    saveOpenItemTabBarScrollLeft(PROFILE_RESOURCE_TAB_BAR_SCROLL_KEY, 180)
    const el = document.createElement('div')
    Object.defineProperty(el, 'scrollLeft', { value: 0, writable: true, configurable: true })
    persistOpenItemTabBarScrollOnRelease(PROFILE_RESOURCE_TAB_BAR_SCROLL_KEY, el)
    expect(loadOpenItemTabBarScrollLeft(PROFILE_RESOURCE_TAB_BAR_SCROLL_KEY)).toBe(180)
  })

  it('restoreOpenItemTabBarScrollPosition applies saved scrollLeft', () => {
    const el = document.createElement('div')
    Object.defineProperty(el, 'scrollWidth', { value: 400, configurable: true })
    Object.defineProperty(el, 'clientWidth', { value: 200, configurable: true })
    saveOpenItemTabBarScrollLeft(PROFILE_RESOURCE_TAB_BAR_SCROLL_KEY, 120)
    expect(restoreOpenItemTabBarScrollPosition(el, PROFILE_RESOURCE_TAB_BAR_SCROLL_KEY)).toBe(true)
    expect(el.scrollLeft).toBe(120)
  })

  it('clampTabBarScrollLeft respects scrollWidth', () => {
    const el = document.createElement('div')
    Object.defineProperty(el, 'scrollWidth', { value: 400, configurable: true })
    Object.defineProperty(el, 'clientWidth', { value: 200, configurable: true })
    expect(clampTabBarScrollLeft(el, 999)).toBe(200)
    expect(clampTabBarScrollLeft(el, -5)).toBe(0)
  })
})
