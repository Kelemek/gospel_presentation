import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import ProfileResourceTabs from '../ProfileResourceTabs'

const tabs = [
  { slug: 'default', title: 'The Gospel' },
  { slug: 'sg', title: 'Spurgeon' },
]

describe('ProfileResourceTabs', () => {
  it('renders nothing when tabs are empty or only one resource is open', () => {
    const { container: empty } = render(
      <ProfileResourceTabs
        tabs={[]}
        activeSlug="default"
        onSelectTab={jest.fn()}
        onCloseTab={jest.fn()}
      />
    )
    expect(empty).toBeEmptyDOMElement()

    const { container: single } = render(
      <ProfileResourceTabs
        tabs={[{ slug: 'default', title: 'The Gospel' }]}
        activeSlug="default"
        onSelectTab={jest.fn()}
        onCloseTab={jest.fn()}
      />
    )
    expect(single).toBeEmptyDOMElement()
  })

  it('renders tabs with active selection', () => {
    render(
      <ProfileResourceTabs
        tabs={tabs}
        activeSlug="default"
        onSelectTab={jest.fn()}
        onCloseTab={jest.fn()}
      />
    )
    const tablist = screen.getByRole('tablist', { name: /open resources/i })
    expect(tablist).toBeInTheDocument()
    expect(tablist).toHaveClass('overflow-x-auto')
    const activeTab = screen.getByRole('tab', { name: 'The Gospel', selected: true })
    expect(activeTab).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Spurgeon', selected: false })).toBeInTheDocument()
  })

  it('shows full tab titles without truncating in the tab row', () => {
    const longTabs = [
      { slug: 'a', title: 'Love: A Biblical Perspective' },
      { slug: 'b', title: 'The Gospel Presentation' },
    ]
    render(
      <ProfileResourceTabs
        tabs={longTabs}
        activeSlug="a"
        onSelectTab={jest.fn()}
        onCloseTab={jest.fn()}
      />
    )
    expect(screen.getByRole('tab', { name: 'Love: A Biblical Perspective' })).toHaveTextContent(
      'Love: A Biblical Perspective'
    )
    expect(screen.getByRole('tab', { name: 'The Gospel Presentation' })).toHaveTextContent(
      'The Gospel Presentation'
    )
  })

  it('calls onSelectTab when a tab is clicked', () => {
    const onSelectTab = jest.fn()
    render(
      <ProfileResourceTabs
        tabs={tabs}
        activeSlug="default"
        onSelectTab={onSelectTab}
        onCloseTab={jest.fn()}
      />
    )
    fireEvent.click(screen.getByRole('tab', { name: 'Spurgeon' }))
    expect(onSelectTab).toHaveBeenCalledWith('sg')
  })

  it('calls onCloseTab when close is clicked', () => {
    const onCloseTab = jest.fn()
    render(
      <ProfileResourceTabs
        tabs={tabs}
        activeSlug="default"
        onSelectTab={jest.fn()}
        onCloseTab={onCloseTab}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Close Spurgeon' }))
    expect(onCloseTab).toHaveBeenCalledWith('sg')
    expect(onCloseTab).toHaveBeenCalledTimes(1)
  })
})
