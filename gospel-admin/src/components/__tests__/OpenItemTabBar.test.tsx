import React from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import OpenItemTabBar, { type OpenItemTab } from '../OpenItemTabBar'

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
