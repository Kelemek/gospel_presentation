import React from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import ScriptureModalTabs from '../ScriptureModalTabs'
import type { ProfileRecentScriptureEntry } from '@/lib/profileLastOpenResourceStorage'

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
  it('renders nothing when only one passage is open', () => {
    const { container } = render(
      <ScriptureModalTabs
        tabs={[tabs[0]!]}
        activeSlug="default"
        activeReference="John 3:16"
        onSelectTab={jest.fn()}
        onCloseTab={jest.fn()}
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
      />
    )
    expect(screen.getByRole('tablist', { name: /open scripture passages/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Romans 8:1' }))
    expect(onSelectTab).toHaveBeenCalledWith(tabs[1])
    fireEvent.click(screen.getByRole('button', { name: 'Close Romans 8:1' }))
    expect(onCloseTab).toHaveBeenCalledWith(tabs[1])
  })

  it('splits book and chapter:verse so suffix does not use end-truncation', () => {
    render(
      <ScriptureModalTabs
        tabs={tabs}
        activeSlug="default"
        activeReference="John 3:16"
        onSelectTab={jest.fn()}
        onCloseTab={jest.fn()}
      />
    )
    const romansTab = screen.getByRole('tab', { name: 'Romans 8:1' })
    expect(within(romansTab).getByText('Romans')).toBeInTheDocument()
    expect(within(romansTab).getByText('8:1')).toBeInTheDocument()
    expect(romansTab.querySelector('.gap-x-1')).toBeInTheDocument()
  })
})
