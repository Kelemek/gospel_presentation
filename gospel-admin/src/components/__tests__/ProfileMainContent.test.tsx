/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react'
import ProfileMainContent from '@/components/ProfileMainContent'

jest.mock('@/components/GospelSection', () => ({
  __esModule: true,
  default: ({
    section,
    onScriptureClick,
    onHighlightMarkClick,
  }: {
    section: { title: string }
    onScriptureClick: (ref: string) => void
    onHighlightMarkClick: (id: string) => void
  }) => (
    <div data-testid={`section-${section.title}`}>
      <button type="button" onClick={() => onScriptureClick('John 3:16')}>
        Open John 3:16
      </button>
      <button type="button" onClick={() => onHighlightMarkClick('hl-1')}>
        Remove highlight
      </button>
    </div>
  ),
}))

const sections = [
  {
    section: '1',
    title: 'God',
    subsections: [{ title: 'Holy', content: 'text', scriptureReferences: [] }],
  },
] as never

describe('ProfileMainContent', () => {
  it('renders gospel sections and forwards scripture clicks', () => {
    const onScriptureClick = jest.fn()
    render(
      <ProfileMainContent
        mainContentRef={{ current: null }}
        sections={sections}
        onScriptureClick={onScriptureClick}
        versePinsList={[]}
        onRemoveVersePin={jest.fn()}
        profileSlug="default"
        highlightsByScopeId={{}}
        activeHighlightId={null}
        onHighlightMarkClick={jest.fn()}
        isMenuOpen={false}
        onCloseMenu={jest.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open John 3:16' }))
    expect(onScriptureClick).toHaveBeenCalledWith('John 3:16')
    expect(screen.getByTestId('section-God')).toBeInTheDocument()
  })

  it('closes the menu when open and the main area is clicked', () => {
    const onCloseMenu = jest.fn()
    const { container } = render(
      <ProfileMainContent
        mainContentRef={{ current: null }}
        sections={sections}
        onScriptureClick={jest.fn()}
        versePinsList={[]}
        onRemoveVersePin={jest.fn()}
        profileSlug="default"
        highlightsByScopeId={{}}
        activeHighlightId={null}
        onHighlightMarkClick={jest.fn()}
        isMenuOpen
        onCloseMenu={onCloseMenu}
      />
    )

    fireEvent.click(container.firstElementChild!)
    expect(onCloseMenu).toHaveBeenCalledTimes(1)
  })

  it('forwards highlight mark clicks to the parent handler', () => {
    const onHighlightMarkClick = jest.fn()
    render(
      <ProfileMainContent
        mainContentRef={{ current: null }}
        sections={sections}
        onScriptureClick={jest.fn()}
        versePinsList={[]}
        onRemoveVersePin={jest.fn()}
        profileSlug="default"
        highlightsByScopeId={{}}
        activeHighlightId="hl-1"
        onHighlightMarkClick={onHighlightMarkClick}
        isMenuOpen={false}
        onCloseMenu={jest.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Remove highlight' }))
    expect(onHighlightMarkClick).toHaveBeenCalledWith('hl-1')
  })
})
