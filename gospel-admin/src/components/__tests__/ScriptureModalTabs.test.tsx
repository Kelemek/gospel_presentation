import React, { createRef } from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import ScriptureModalTabs from '../ScriptureModalTabs'
import type { ProfileRecentScriptureEntry } from '@/lib/profileLastOpenResourceStorage'

const contentRootRef = createRef<HTMLDivElement>()

const tabs: ProfileRecentScriptureEntry[] = [
  {
    slug: 'default',
    profileTitle: 'Gospel',
    reference: 'John 3:16',
    sectionId: 's1',
    subsectionId: 's1-0',
    openedAt: 1,
  },
  {
    slug: 'default',
    profileTitle: 'Gospel',
    reference: 'Romans 8:1',
    sectionId: 's2',
    subsectionId: 's2-0',
    openedAt: 2,
  },
]

describe('ScriptureModalTabs', () => {
  it('renders single tab with search and no close control', () => {
    render(
      <ScriptureModalTabs
        tabs={[tabs[0]!]}
        activeSlug="default"
        activeReference="John 3:16"
        onSelectTab={jest.fn()}
        onCloseTab={jest.fn()}
        onToggleSearch={jest.fn()}
        contentRootRef={contentRootRef}
      />
    )
    expect(screen.getByRole('tablist', { name: /open scripture passages/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Search in passage' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Close John 3:16' })).not.toBeInTheDocument()
  })

  it('renders nothing when tabs array is empty', () => {
    const { container } = render(
      <ScriptureModalTabs
        tabs={[]}
        activeSlug="default"
        activeReference="John 3:16"
        onSelectTab={jest.fn()}
        onCloseTab={jest.fn()}
        contentRootRef={contentRootRef}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders tabs and calls handlers', () => {
    const onSelectTab = jest.fn()
    const onCloseTab = jest.fn()
    render(
      <ScriptureModalTabs
        tabs={tabs}
        activeSlug="default"
        activeReference="John 3:16"
        onSelectTab={onSelectTab}
        onCloseTab={onCloseTab}
        contentRootRef={contentRootRef}
      />
    )
    expect(screen.getByRole('tablist', { name: /open scripture passages/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Romans 8:1' }))
    expect(onSelectTab).toHaveBeenCalledWith(tabs[1])
    fireEvent.click(screen.getByRole('button', { name: 'Close Romans 8:1' }))
    expect(onCloseTab).toHaveBeenCalledWith(tabs[1])
  })

  it('splits book and chapter:verse on separate nodes for scripture tabs', () => {
    render(
      <ScriptureModalTabs
        tabs={tabs}
        activeSlug="default"
        activeReference="John 3:16"
        onSelectTab={jest.fn()}
        onCloseTab={jest.fn()}
        contentRootRef={contentRootRef}
      />
    )
    const romansTab = screen.getByRole('tab', { name: 'Romans 8:1' })
    expect(within(romansTab).getByText('Romans')).toBeInTheDocument()
    expect(within(romansTab).getByText('8:1')).toBeInTheDocument()
    expect(romansTab.querySelector('.gap-x-1')).toBeInTheDocument()
  })

  it('toggles passage search panel from spyglass', () => {
    const onToggleSearch = jest.fn()
    render(
      <ScriptureModalTabs
        tabs={tabs}
        activeSlug="default"
        activeReference="John 3:16"
        onSelectTab={jest.fn()}
        onCloseTab={jest.fn()}
        searchOpen
        onToggleSearch={onToggleSearch}
        contentRootRef={contentRootRef}
      />
    )
    const searchButton = screen.getByRole('button', { name: 'Search in passage' })
    expect(searchButton).toHaveAttribute('data-tour', 'scripture-modal-search')
    expect(screen.getByRole('searchbox', { name: 'Search in passage' })).toBeInTheDocument()
    fireEvent.click(searchButton)
    expect(onToggleSearch).toHaveBeenCalledTimes(1)
  })
})
