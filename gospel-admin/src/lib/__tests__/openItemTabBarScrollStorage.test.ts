import {
  clampTabBarScrollLeft,
  dispatchRevealActiveOpenItemTab,
  isOpenItemTabVisibleInTabBar,
  loadOpenItemTabBarScrollLeft,
  persistOpenItemTabBarScrollOnRelease,
  PROFILE_RESOURCE_TAB_BAR_SCROLL_KEY,
  REVEAL_ACTIVE_OPEN_ITEM_TAB_EVENT,
  restoreOpenItemTabBarScrollPosition,
  revealActiveOpenItemTabIfOffScreen,
  saveOpenItemTabBarScrollLeft,
  scrollOpenItemTabIntoView,
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

  it('scrollOpenItemTabIntoView scrolls the tab row and saves scrollLeft', () => {
    const scrollEl = document.createElement('div')
    const tab = document.createElement('div')
    tab.setAttribute('data-open-item-tab-id', 'new-tab')
    tab.scrollIntoView = jest.fn()
    scrollEl.appendChild(tab)
    Object.defineProperty(scrollEl, 'scrollWidth', { value: 400, configurable: true })
    Object.defineProperty(scrollEl, 'clientWidth', { value: 200, configurable: true })
    Object.defineProperty(scrollEl, 'scrollLeft', { value: 88, writable: true, configurable: true })

    expect(scrollOpenItemTabIntoView(scrollEl, 'new-tab', PROFILE_RESOURCE_TAB_BAR_SCROLL_KEY)).toBe(
      true
    )
    expect(tab.scrollIntoView).toHaveBeenCalledWith({
      block: 'nearest',
      inline: 'nearest',
      behavior: 'auto',
    })
    expect(loadOpenItemTabBarScrollLeft(PROFILE_RESOURCE_TAB_BAR_SCROLL_KEY)).toBe(88)
  })

  it('scrollOpenItemTabIntoView accepts smooth scroll behavior', () => {
    const scrollEl = document.createElement('div')
    const tab = document.createElement('div')
    tab.setAttribute('data-open-item-tab-id', 'b-tab')
    tab.scrollIntoView = jest.fn()
    scrollEl.appendChild(tab)

    scrollOpenItemTabIntoView(scrollEl, 'b-tab', undefined, { behavior: 'smooth' })
    expect(tab.scrollIntoView).toHaveBeenCalledWith({
      block: 'nearest',
      inline: 'nearest',
      behavior: 'smooth',
    })
  })

  it('isOpenItemTabVisibleInTabBar detects tabs outside the scroll viewport', () => {
    const scrollEl = document.createElement('div')
    const tab = document.createElement('div')
    tab.setAttribute('data-open-item-tab-id', 'off-screen')
    scrollEl.appendChild(tab)
    Object.defineProperty(scrollEl, 'scrollWidth', { value: 400, configurable: true })
    Object.defineProperty(scrollEl, 'clientWidth', { value: 200, configurable: true })

    scrollEl.getBoundingClientRect = jest.fn(() => ({
      left: 0,
      right: 200,
      top: 0,
      bottom: 40,
      width: 200,
      height: 40,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })) as typeof scrollEl.getBoundingClientRect

    tab.getBoundingClientRect = jest.fn(() => ({
      left: 220,
      right: 320,
      top: 0,
      bottom: 40,
      width: 100,
      height: 40,
      x: 220,
      y: 0,
      toJSON: () => ({}),
    })) as typeof tab.getBoundingClientRect

    expect(isOpenItemTabVisibleInTabBar(scrollEl, 'off-screen')).toBe(false)
  })

  it('revealActiveOpenItemTabIfOffScreen scrolls only when the tab is clipped', () => {
    const scrollEl = document.createElement('div')
    const tab = document.createElement('div')
    tab.setAttribute('data-open-item-tab-id', 'active-tab')
    tab.scrollIntoView = jest.fn()
    scrollEl.appendChild(tab)
    Object.defineProperty(scrollEl, 'scrollWidth', { value: 400, configurable: true })
    Object.defineProperty(scrollEl, 'clientWidth', { value: 200, configurable: true })

    scrollEl.getBoundingClientRect = jest.fn(() => ({
      left: 0,
      right: 200,
      top: 0,
      bottom: 40,
      width: 200,
      height: 40,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })) as typeof scrollEl.getBoundingClientRect

    tab.getBoundingClientRect = jest.fn(() => ({
      left: 220,
      right: 320,
      top: 0,
      bottom: 40,
      width: 100,
      height: 40,
      x: 220,
      y: 0,
      toJSON: () => ({}),
    })) as typeof tab.getBoundingClientRect

    expect(
      revealActiveOpenItemTabIfOffScreen(scrollEl, 'active-tab', undefined, { behavior: 'smooth' })
    ).toBe(true)
    expect(tab.scrollIntoView).toHaveBeenCalledWith({
      block: 'nearest',
      inline: 'nearest',
      behavior: 'smooth',
    })
  })

  it('dispatchRevealActiveOpenItemTab emits a window event', () => {
    const handler = jest.fn()
    window.addEventListener(REVEAL_ACTIVE_OPEN_ITEM_TAB_EVENT, handler)
    dispatchRevealActiveOpenItemTab()
    expect(handler).toHaveBeenCalledTimes(1)
    window.removeEventListener(REVEAL_ACTIVE_OPEN_ITEM_TAB_EVENT, handler)
  })
})
