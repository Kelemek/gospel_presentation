import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import ProfileResourceTabs from '../ProfileResourceTabs'

const tabs = [
  { slug: 'default', title: 'The Gospel' },
  { slug: 'sg', title: 'Spurgeon' },
]

function mockMatchMedia(matches = false) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: query.includes('max-width') ? matches : false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
  })
}

describe('ProfileResourceTabs', () => {
  beforeEach(() => {
    mockMatchMedia(false)
  })
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
    expect(screen.getByRole('tablist', { name: /open resources/i })).toBeInTheDocument()
    const activeTab = screen.getByRole('tab', { name: 'The Gospel', selected: true })
    expect(activeTab).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Spurgeon', selected: false })).toBeInTheDocument()
  })

  it('shows full active resource title below tabs on mobile', () => {
    render(
      <ProfileResourceTabs
        tabs={tabs}
        activeSlug="default"
        onSelectTab={jest.fn()}
        onCloseTab={jest.fn()}
      />
    )
    const activeTitle = screen.getByTestId('profile-resource-tabs-active-title')
    expect(activeTitle).toHaveTextContent('The Gospel')
    expect(activeTitle).toHaveClass('sm:hidden')
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

  it('shows a flyover layer on mobile when the active tab changes', () => {
    mockMatchMedia(true)
    const rect = {
      x: 0,
      y: 0,
      width: 120,
      height: 24,
      top: 0,
      left: 0,
      right: 120,
      bottom: 24,
      toJSON: () => ({}),
    }
    jest.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(rect)

    const { rerender } = render(
      <ProfileResourceTabs
        tabs={tabs}
        activeSlug="default"
        onSelectTab={jest.fn()}
        onCloseTab={jest.fn()}
      />
    )

    rerender(
      <ProfileResourceTabs
        tabs={tabs}
        activeSlug="sg"
        onSelectTab={jest.fn()}
        onCloseTab={jest.fn()}
      />
    )

    expect(screen.getByTestId('profile-resource-tabs-title-flyover')).toHaveTextContent('Spurgeon')
    jest.restoreAllMocks()
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
