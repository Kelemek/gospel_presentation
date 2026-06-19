import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemorizeListenSpeedButton } from '../MemorizeListenSpeedButton'

describe('MemorizeListenSpeedButton', () => {
  it('opens portaled listbox and calls onSelect when an option is chosen', async () => {
    const user = userEvent.setup()
    const onSelect = jest.fn()
    render(
      <MemorizeListenSpeedButton value={1} onSelect={onSelect} inline />
    )
    await user.click(screen.getByTestId('memorize-listen-speed'))
    await user.click(screen.getByTestId('memorize-listen-speed-option-1.5'))
    expect(onSelect).toHaveBeenCalledWith(1.5)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('closes listbox on Escape', async () => {
    const user = userEvent.setup()
    render(
      <MemorizeListenSpeedButton value={1} onSelect={jest.fn()} inline />
    )
    await user.click(screen.getByTestId('memorize-listen-speed'))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('highlights the selected speed with blue theme', async () => {
    const user = userEvent.setup()
    render(
      <MemorizeListenSpeedButton value={1.5} onSelect={jest.fn()} inline />
    )
    await user.click(screen.getByTestId('memorize-listen-speed'))
    const selected = screen.getByTestId('memorize-listen-speed-option-1.5')
    expect(selected).toHaveAttribute('aria-selected', 'true')
    expect(selected.className).toContain('bg-blue-100')
    expect(selected.className).toContain('text-blue-800')
  })
})
