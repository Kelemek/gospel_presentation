import React from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import OpenItemTabBar, {
  applyOpenItemTabBarWheelScroll,
  wheelDeltaForOpenItemTabBarScroll,
  type OpenItemTab,
} from '../OpenItemTabBar'
import {
  loadOpenItemTabBarScrollLeft,
  PROFILE_RESOURCE_TAB_BAR_SCROLL_KEY,
  saveOpenItemTabBarScrollLeft,
  scrollOpenItemTabIntoView,
} from '@/lib/openItemTabBarScrollStorage'

jest.mock('@/lib/openItemTabBarScrollStorage', () => {
  const actual = jest.requireActual<typeof import('@/lib/openItemTabBarScrollStorage')>(
    '@/lib/openItemTabBarScrollStorage'
  )
  return {
    ...actual,
    scrollOpenItemTabIntoView: jest.fn(actual.scrollOpenItemTabIntoView),
  }
})

jest.mock('@/lib/openItemTabBarDragScroll', () => {
  const actual = jest.requireActual<typeof import('@/lib/openItemTabBarDragScroll')>(
    '@/lib/openItemTabBarDragScroll'
  )
  return {
    ...actual,
    attachOpenItemTabBarDragScroll: jest.fn(actual.attachOpenItemTabBarDragScroll),
  }
})

import { attachOpenItemTabBarDragScroll } from '@/lib/openItemTabBarDragScroll'
import { installTestSessionStorage } from '@/lib/testing/testLocalStorage'

const attachDragScrollMock = jest.mocked(attachOpenItemTabBarDragScroll)

const resourceTabs: OpenItemTab[] = [
  { id: 'default', title: 'The Gospel' },
  { id: 'sg', title: 'Spurgeon Sermons' },
]

const scriptureTabs: OpenItemTab[] = [
  {
    id: 'default|John 3:16',
    title: 'John 3:16',
    titleParts: { book: 'John', suffix: '3:16' },
  },
  {
    id: 'default|Romans 8:1',
    title: 'Romans 8:1',
    titleParts: { book: 'Romans', suffix: '8:1' },
  },
]

describe('OpenItemTabBar', () => {
  beforeEach(() => {
    installTestSessionStorage()
    window.sessionStorage.clear()
    attachDragScrollMock.mockClear()
  })

  it('does not reattach wheel/drag listeners when tab count changes', () => {
    const baseProps = {
      activeId: 'default',
      onSelectTab: jest.fn(),
      onCloseTab: jest.fn(),
      tablistAriaLabel: 'Open resources',
    }
    const { rerender } = render(<OpenItemTabBar {...baseProps} tabs={resourceTabs} />)
    expect(attachDragScrollMock).toHaveBeenCalledTimes(1)

    rerender(
      <OpenItemTabBar
        {...baseProps}
        tabs={[...resourceTabs, { id: 'new-resource', title: 'New Resource' }]}
      />
    )
    expect(attachDragScrollMock).toHaveBeenCalledTimes(1)
  })

  it('captures horizontal scroll on tab pointerdown before navigation unmount', () => {
    const props = {
      tabs: resourceTabs,
      activeId: 'default',
      onSelectTab: jest.fn(),
      onCloseTab: jest.fn(),
      tablistAriaLabel: 'Open resources',
      persistScrollKey: PROFILE_RESOURCE_TAB_BAR_SCROLL_KEY,
    }

    saveOpenItemTabBarScrollLeft(PROFILE_RESOURCE_TAB_BAR_SCROLL_KEY, 0)

    render(<OpenItemTabBar {...props} />)
    const tablist = screen.getByRole('tablist', { name: 'Open resources' })
    Object.defineProperty(tablist, 'scrollLeft', { value: 150, writable: true, configurable: true })

    fireEvent.pointerDown(screen.getByRole('tab', { name: 'Spurgeon Sermons' }))
    expect(loadOpenItemTabBarScrollLeft(PROFILE_RESOURCE_TAB_BAR_SCROLL_KEY)).toBe(150)
  })

  it('does not overwrite saved scroll with 0 on unmount after DOM reset', () => {
    const props = {
      tabs: resourceTabs,
      activeId: 'default',
      onSelectTab: jest.fn(),
      onCloseTab: jest.fn(),
      tablistAriaLabel: 'Open resources',
      persistScrollKey: PROFILE_RESOURCE_TAB_BAR_SCROLL_KEY,
    }

    saveOpenItemTabBarScrollLeft(PROFILE_RESOURCE_TAB_BAR_SCROLL_KEY, 150)
    const { unmount } = render(<OpenItemTabBar {...props} />)
    const tablist = screen.getByRole('tablist', { name: 'Open resources' })
    Object.defineProperty(tablist, 'scrollLeft', { value: 0, writable: true, configurable: true })
    unmount()

    expect(loadOpenItemTabBarScrollLeft(PROFILE_RESOURCE_TAB_BAR_SCROLL_KEY)).toBe(150)
  })

  it('renders nothing when only one tab is open', () => {
    const { container } = render(
      <OpenItemTabBar
        tabs={[resourceTabs[0]!]}
        activeId="default"
        onSelectTab={jest.fn()}
        onCloseTab={jest.fn()}
        tablistAriaLabel="Open resources"
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders tablist, active state, and data-tour', () => {
    render(
      <OpenItemTabBar
        tabs={resourceTabs}
        activeId="default"
        onSelectTab={jest.fn()}
        onCloseTab={jest.fn()}
        tablistAriaLabel="Open resources"
        dataTour="resource-tabs"
      />
    )
    const tablist = screen.getByRole('tablist', { name: 'Open resources' })
    expect(tablist).toHaveClass('overflow-x-auto')
    expect(tablist.closest('[data-tour="resource-tabs"]')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'The Gospel', selected: true })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Spurgeon Sermons', selected: false })).toBeInTheDocument()
  })

  it('calls onSelectTab and onCloseTab with tab id', () => {
    const onSelectTab = jest.fn()
    const onCloseTab = jest.fn()
    render(
      <OpenItemTabBar
        tabs={resourceTabs}
        activeId="default"
        onSelectTab={onSelectTab}
        onCloseTab={onCloseTab}
        tablistAriaLabel="Open resources"
      />
    )
    fireEvent.click(screen.getByRole('tab', { name: 'Spurgeon Sermons' }))
    expect(onSelectTab).toHaveBeenCalledWith('sg')
    fireEvent.click(screen.getByRole('button', { name: 'Close Spurgeon Sermons' }))
    expect(onCloseTab).toHaveBeenCalledWith('sg')
    expect(onCloseTab).toHaveBeenCalledTimes(1)
  })

  it('uses custom ariaLabel when provided', () => {
    render(
      <OpenItemTabBar
        tabs={[{ id: 'a', title: 'Short', ariaLabel: 'Full title for screen readers' }, resourceTabs[1]!]}
        activeId="a"
        onSelectTab={jest.fn()}
        onCloseTab={jest.fn()}
        tablistAriaLabel="Open resources"
      />
    )
    expect(screen.getByRole('tab', { name: 'Full title for screen readers' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close Full title for screen readers' })).toBeInTheDocument()
  })

  it('shows full tab titles without truncating in the tab row', () => {
    render(
      <OpenItemTabBar
        tabs={[
          { id: 'a', title: 'Love: A Biblical Perspective' },
          { id: 'b', title: 'The Gospel Presentation' },
        ]}
        activeId="a"
        onSelectTab={jest.fn()}
        onCloseTab={jest.fn()}
        tablistAriaLabel="Open resources"
      />
    )
    expect(screen.getByRole('tab', { name: 'Love: A Biblical Perspective' })).toHaveTextContent(
      'Love: A Biblical Perspective'
    )
  })

  it('scrolls a newly opened tab into view when revealTabId matches active tab', () => {
    const scrollMock = jest.mocked(scrollOpenItemTabIntoView)
    scrollMock.mockClear()

    // Jest/jsdom does not flush real rAF; the reveal effect retries via rAF until layout is measurable.
    const rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 1
    })

    try {
      render(
        <OpenItemTabBar
          tabs={[...resourceTabs, { id: 'new-resource', title: 'New Resource' }]}
          activeId="new-resource"
          onSelectTab={jest.fn()}
          onCloseTab={jest.fn()}
          tablistAriaLabel="Open resources"
          revealTabId="new-resource"
        />
      )

      const tablist = screen.getByRole('tablist', { name: 'Open resources' })
      expect(scrollMock).toHaveBeenCalledWith(tablist, 'new-resource', undefined)
    } finally {
      rafSpy.mockRestore()
    }
  })

  it('maps vertical wheel to horizontal scroll when the tab row overflows', () => {
    render(
      <OpenItemTabBar
        tabs={resourceTabs}
        activeId="default"
        onSelectTab={jest.fn()}
        onCloseTab={jest.fn()}
        tablistAriaLabel="Open resources"
      />
    )
    const tablist = screen.getByRole('tablist', { name: 'Open resources' })
    Object.defineProperty(tablist, 'scrollWidth', { value: 500, configurable: true })
    Object.defineProperty(tablist, 'clientWidth', { value: 200, configurable: true })
    let scrollLeft = 10
    Object.defineProperty(tablist, 'scrollLeft', {
      get: () => scrollLeft,
      set: (value: number) => {
        scrollLeft = value
      },
      configurable: true,
    })

    const event = new WheelEvent('wheel', { deltaY: 24, deltaX: 0, cancelable: true })
    tablist.dispatchEvent(event)
    expect(scrollLeft).toBe(34)
    expect(event.defaultPrevented).toBe(true)
  })

  it('drag-scrolls the tab row without firing tab click when movement exceeds threshold', () => {
    const onSelectTab = jest.fn()
    render(
      <OpenItemTabBar
        tabs={resourceTabs}
        activeId="default"
        onSelectTab={onSelectTab}
        onCloseTab={jest.fn()}
        tablistAriaLabel="Open resources"
      />
    )
    const tablist = screen.getByRole('tablist', { name: 'Open resources' })
    const tab = screen.getByRole('tab', { name: 'Spurgeon Sermons' })
    Object.defineProperty(tablist, 'scrollWidth', { value: 500, configurable: true })
    Object.defineProperty(tablist, 'clientWidth', { value: 200, configurable: true })
    let scrollLeft = 100
    Object.defineProperty(tablist, 'scrollLeft', {
      get: () => scrollLeft,
      set: (value: number) => {
        scrollLeft = value
      },
      configurable: true,
    })

    fireEvent.pointerDown(tab, { clientX: 100, pointerId: 1, pointerType: 'mouse', button: 0 })
    fireEvent.pointerMove(window, { clientX: 150, pointerId: 1, pointerType: 'mouse' })
    fireEvent.pointerUp(window, { clientX: 150, pointerId: 1, pointerType: 'mouse' })
    fireEvent.click(tab)
    expect(scrollLeft).toBe(50)
    expect(onSelectTab).not.toHaveBeenCalled()
  })

  it('still selects tab on click when pointer movement is below drag threshold', () => {
    const onSelectTab = jest.fn()
    render(
      <OpenItemTabBar
        tabs={resourceTabs}
        activeId="default"
        onSelectTab={onSelectTab}
        onCloseTab={jest.fn()}
        tablistAriaLabel="Open resources"
      />
    )
    const tablist = screen.getByRole('tablist', { name: 'Open resources' })
    const tab = screen.getByRole('tab', { name: 'Spurgeon Sermons' })
    Object.defineProperty(tablist, 'scrollWidth', { value: 500, configurable: true })
    Object.defineProperty(tablist, 'clientWidth', { value: 200, configurable: true })

    fireEvent.pointerDown(tab, { clientX: 100, pointerId: 2, pointerType: 'mouse', button: 0 })
    fireEvent.pointerMove(window, { clientX: 102, pointerId: 2, pointerType: 'mouse' })
    fireEvent.pointerUp(window, { clientX: 102, pointerId: 2, pointerType: 'mouse' })
    fireEvent.click(tab)
    expect(onSelectTab).toHaveBeenCalledWith('sg')
  })

  it('applyOpenItemTabBarWheelScroll ignores wheel when row does not overflow', () => {
    const el = document.createElement('div')
    Object.defineProperty(el, 'scrollWidth', { value: 100, configurable: true })
    Object.defineProperty(el, 'clientWidth', { value: 100, configurable: true })
    const event = new WheelEvent('wheel', { deltaY: 24, deltaX: 0, cancelable: true })
    expect(applyOpenItemTabBarWheelScroll(el, event)).toBe(false)
    expect(event.defaultPrevented).toBe(false)
  })

  it('wheelDeltaForOpenItemTabBarScroll uses deltaX when Shift remaps vertical wheel', () => {
    const shiftWheel = new WheelEvent('wheel', { deltaY: 0, deltaX: 18, cancelable: true })
    expect(wheelDeltaForOpenItemTabBarScroll(shiftWheel)).toBe(18)
  })

  it('maps Shift+wheel (deltaX only) to horizontal scroll when the tab row overflows', () => {
    render(
      <OpenItemTabBar
        tabs={resourceTabs}
        activeId="default"
        onSelectTab={jest.fn()}
        onCloseTab={jest.fn()}
        tablistAriaLabel="Open resources"
      />
    )
    const tablist = screen.getByRole('tablist', { name: 'Open resources' })
    Object.defineProperty(tablist, 'scrollWidth', { value: 500, configurable: true })
    Object.defineProperty(tablist, 'clientWidth', { value: 200, configurable: true })
    let scrollLeft = 5
    Object.defineProperty(tablist, 'scrollLeft', {
      get: () => scrollLeft,
      set: (value: number) => {
        scrollLeft = value
      },
      configurable: true,
    })

    const event = new WheelEvent('wheel', { deltaY: 0, deltaX: 20, cancelable: true })
    tablist.dispatchEvent(event)
    expect(scrollLeft).toBe(25)
    expect(event.defaultPrevented).toBe(true)
  })

  it('renders titleParts with book and suffix on separate nodes', () => {
    render(
      <OpenItemTabBar
        tabs={scriptureTabs}
        activeId="default|John 3:16"
        onSelectTab={jest.fn()}
        onCloseTab={jest.fn()}
        tablistAriaLabel="Open scripture passages"
      />
    )
    const romansTab = screen.getByRole('tab', { name: 'Romans 8:1' })
    expect(within(romansTab).getByText('Romans')).toBeInTheDocument()
    expect(within(romansTab).getByText('8:1')).toBeInTheDocument()
    expect(romansTab.querySelector('.gap-x-1')).toBeInTheDocument()
  })
})
