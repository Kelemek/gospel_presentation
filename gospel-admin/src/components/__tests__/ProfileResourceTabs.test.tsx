import React, { createRef } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import ProfileResourceTabs from '../ProfileResourceTabs'

const tabs = [
  { slug: 'default', title: 'The Gospel' },
  { slug: 'sg', title: 'Spurgeon' },
]

function defaultProps(overrides: Partial<React.ComponentProps<typeof ProfileResourceTabs>> = {}) {
  const contentRootRef = createRef<HTMLElement>()
  contentRootRef.current = document.createElement('main')
  return {
    tabs,
    activeSlug: 'default',
    onSelectTab: jest.fn(),
    onCloseTab: jest.fn(),
    contentRootRef,
    ...overrides,
  }
}

describe('ProfileResourceTabs', () => {
  it('renders nothing when tabs are empty', () => {
    const { container } = render(
      <ProfileResourceTabs
        {...defaultProps({ tabs: [] })}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a full-width single tab with search toggle', () => {
    render(
      <ProfileResourceTabs
        {...defaultProps({
          tabs: [{ slug: 'default', title: 'The Gospel' }],
          onToggleSearch: jest.fn(),
        })}
      />
    )
    const tab = screen.getByRole('tab', { name: 'The Gospel' })
    expect(tab).toBeInTheDocument()
    expect(tab).toHaveClass('flex-1', 'justify-center')
    expect(screen.getByRole('button', { name: 'Search in resource' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Close The Gospel' })).not.toBeInTheDocument()
  })

  it('renders tabs with active selection', () => {
    render(<ProfileResourceTabs {...defaultProps()} />)
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
        {...defaultProps({ tabs: longTabs, activeSlug: 'a' })}
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
        {...defaultProps({ onSelectTab })}
      />
    )
    fireEvent.click(screen.getByRole('tab', { name: 'Spurgeon' }))
    expect(onSelectTab).toHaveBeenCalledWith('sg')
  })

  it('calls onCloseTab when close is clicked', () => {
    const onCloseTab = jest.fn()
    render(
      <ProfileResourceTabs
        {...defaultProps({ onCloseTab })}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Close Spurgeon' }))
    expect(onCloseTab).toHaveBeenCalledWith('sg')
    expect(onCloseTab).toHaveBeenCalledTimes(1)
  })
})
