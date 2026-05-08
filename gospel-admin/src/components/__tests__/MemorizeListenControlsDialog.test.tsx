/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react'
import { MemorizeListenControlsDialog } from '@/components/MemorizeListenControlsDialog'

const baseProps = {
  open: true,
  onClose: jest.fn(),
  dialogId: 'memorize-listen-controls-dialog',
  titleId: 'memorize-listen-controls-title',
  onPrimaryClick: jest.fn(),
  primaryLabel: 'Play',
  primaryAriaLabel: 'Play',
  primaryAriaPressed: false,
  repeatListenOn: false,
  onRepeatToggle: jest.fn(),
  listenPlaybackRate: 1 as const,
  onSelectSpeed: jest.fn(),
}

describe('MemorizeListenControlsDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('calls onClose when the dimmed backdrop is clicked (not when the inner panel is clicked)', () => {
    const onClose = jest.fn()
    render(<MemorizeListenControlsDialog {...baseProps} onClose={onClose} />)
    const inner = screen.getByRole('dialog', { name: 'Listen' })
    const backdrop = inner.parentElement
    expect(backdrop).toBeTruthy()
    fireEvent.click(backdrop!, { target: backdrop })
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.click(inner)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the dimmed backdrop receives touch (not a bubbled touch from the panel)', () => {
    const onClose = jest.fn()
    render(<MemorizeListenControlsDialog {...baseProps} onClose={onClose} />)
    const inner = screen.getByRole('dialog', { name: 'Listen' })
    const backdrop = inner.parentElement as HTMLElement
    fireEvent.touchStart(backdrop, { target: backdrop })
    expect(onClose).toHaveBeenCalledTimes(1)
    onClose.mockClear()
    fireEvent.touchStart(screen.getByTestId('memorize-listen-passage'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('with showRepeat false, omits Repeat and places speed beside Play', () => {
    render(
      <MemorizeListenControlsDialog
        open
        onClose={jest.fn()}
        dialogId="profile-resource-listen-controls-dialog"
        titleId="profile-resource-listen-controls-title"
        showRepeat={false}
        onPrimaryClick={jest.fn()}
        primaryLabel="Play"
        primaryAriaLabel="Play"
        primaryAriaPressed={false}
        listenPlaybackRate={1}
        onSelectSpeed={jest.fn()}
      />
    )
    expect(screen.queryByTestId('memorize-listen-repeat')).not.toBeInTheDocument()
    expect(screen.getByTestId('memorize-listen-passage')).toBeInTheDocument()
    expect(screen.getByTestId('memorize-listen-speed')).toBeInTheDocument()
  })

  it('with showRepeat false and presentation floating, uses non-modal dialog and no dimmed backdrop', () => {
    render(
      <MemorizeListenControlsDialog
        open
        onClose={jest.fn()}
        dialogId="profile-resource-listen-controls-dialog"
        titleId="profile-resource-listen-controls-title"
        showRepeat={false}
        presentation="floating"
        onPrimaryClick={jest.fn()}
        primaryLabel="Play"
        primaryAriaLabel="Play"
        primaryAriaPressed={false}
        listenPlaybackRate={1}
        onSelectSpeed={jest.fn()}
      />
    )
    const dialog = screen.getByRole('dialog', { name: 'Listen' })
    expect(dialog).toHaveAttribute('aria-modal', 'false')
    const slot = dialog.parentElement
    expect(slot).toHaveClass('pointer-events-auto')
    expect(slot?.parentElement).toHaveClass('pointer-events-none')
  })

  it('with presentation floating, clicking outside the panel does not close (no backdrop)', () => {
    const onClose = jest.fn()
    render(
      <MemorizeListenControlsDialog
        open
        onClose={onClose}
        dialogId="profile-resource-listen-controls-dialog"
        titleId="profile-resource-listen-controls-title"
        showRepeat={false}
        presentation="floating"
        onPrimaryClick={jest.fn()}
        primaryLabel="Play"
        primaryAriaLabel="Play"
        primaryAriaPressed={false}
        listenPlaybackRate={1}
        onSelectSpeed={jest.fn()}
      />
    )
    fireEvent.click(document.body)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('with showRepeat false and onStartFromBeginning, renders Start from beginning control', () => {
    const onStart = jest.fn()
    render(
      <MemorizeListenControlsDialog
        open
        onClose={jest.fn()}
        dialogId="profile-resource-listen-controls-dialog"
        titleId="profile-resource-listen-controls-title"
        showRepeat={false}
        presentation="floating"
        onPrimaryClick={jest.fn()}
        primaryLabel="Play"
        primaryAriaLabel="Play"
        primaryAriaPressed={false}
        listenPlaybackRate={1}
        onSelectSpeed={jest.fn()}
        onStartFromBeginning={onStart}
      />
    )
    fireEvent.click(screen.getByTestId('memorize-listen-start-from-beginning'))
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('with showRepeat false and underline props, renders Underline toggle between Play and speed', () => {
    const onToggle = jest.fn()
    const { rerender } = render(
      <MemorizeListenControlsDialog
        open
        onClose={jest.fn()}
        dialogId="profile-resource-listen-controls-dialog"
        titleId="profile-resource-listen-controls-title"
        showRepeat={false}
        presentation="floating"
        onPrimaryClick={jest.fn()}
        primaryLabel="Play"
        primaryAriaLabel="Play"
        primaryAriaPressed={false}
        listenPlaybackRate={1}
        onSelectSpeed={jest.fn()}
        readAlongUnderlineOn={true}
        onToggleReadAlongUnderline={onToggle}
      />
    )
    const btn = screen.getByTestId('memorize-listen-read-along-underline')
    expect(btn).toHaveAttribute('data-on', 'true')
    expect(btn.querySelector('circle')).toBeNull()
    fireEvent.click(btn)
    expect(onToggle).toHaveBeenCalledTimes(1)

    rerender(
      <MemorizeListenControlsDialog
        open
        onClose={jest.fn()}
        dialogId="profile-resource-listen-controls-dialog"
        titleId="profile-resource-listen-controls-title"
        showRepeat={false}
        presentation="floating"
        onPrimaryClick={jest.fn()}
        primaryLabel="Play"
        primaryAriaLabel="Play"
        primaryAriaPressed={false}
        listenPlaybackRate={1}
        onSelectSpeed={jest.fn()}
        readAlongUnderlineOn={false}
        onToggleReadAlongUnderline={onToggle}
      />
    )
    expect(screen.getByTestId('memorize-listen-read-along-underline')).toHaveAttribute('data-on', 'false')
    expect(screen.getByTestId('memorize-listen-read-along-underline').querySelector('circle')).toBeTruthy()
  })

  it('with showRepeat false and underline on, renders Word and Line style controls', () => {
    const onStyle = jest.fn()
    render(
      <MemorizeListenControlsDialog
        open
        onClose={jest.fn()}
        dialogId="profile-resource-listen-controls-dialog"
        titleId="profile-resource-listen-controls-title"
        showRepeat={false}
        presentation="floating"
        onPrimaryClick={jest.fn()}
        primaryLabel="Play"
        primaryAriaLabel="Play"
        primaryAriaPressed={false}
        listenPlaybackRate={1}
        onSelectSpeed={jest.fn()}
        readAlongUnderlineOn={true}
        onToggleReadAlongUnderline={jest.fn()}
        readAlongUnderlineStyle="word"
        onReadAlongUnderlineStyle={onStyle}
      />
    )
    fireEvent.click(screen.getByTestId('memorize-listen-read-along-style-line'))
    expect(onStyle).toHaveBeenCalledWith('line')
    fireEvent.click(screen.getByTestId('memorize-listen-read-along-style-word'))
    expect(onStyle).toHaveBeenCalledWith('word')
  })

  it('hides Word/Line controls when underline is off', () => {
    render(
      <MemorizeListenControlsDialog
        open
        onClose={jest.fn()}
        dialogId="profile-resource-listen-controls-dialog"
        titleId="profile-resource-listen-controls-title"
        showRepeat={false}
        presentation="floating"
        onPrimaryClick={jest.fn()}
        primaryLabel="Play"
        primaryAriaLabel="Play"
        primaryAriaPressed={false}
        listenPlaybackRate={1}
        onSelectSpeed={jest.fn()}
        readAlongUnderlineOn={false}
        onToggleReadAlongUnderline={jest.fn()}
        readAlongUnderlineStyle="line"
        onReadAlongUnderlineStyle={jest.fn()}
      />
    )
    expect(screen.queryByTestId('memorize-listen-read-along-style-word')).not.toBeInTheDocument()
  })
})
