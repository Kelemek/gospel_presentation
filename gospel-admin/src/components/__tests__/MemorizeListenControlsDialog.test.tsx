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
    const inner = screen.getByRole('dialog', { name: 'Read aloud' })
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
    const inner = screen.getByRole('dialog', { name: 'Read aloud' })
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
    const dialog = screen.getByRole('dialog', { name: 'Read aloud' })
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
})
