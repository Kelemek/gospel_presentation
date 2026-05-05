import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ScriptureModalToolbarMenu from '../ScriptureModalToolbarMenu'

describe('ScriptureModalToolbarMenu', () => {
  it('opens listbox and calls onSelect when an option is chosen', async () => {
    const user = userEvent.setup()
    const onSelect = jest.fn().mockResolvedValue(undefined)
    render(
      <ScriptureModalToolbarMenu
        ariaLabel="Pick fruit"
        listboxAriaLabel="Fruits"
        value="a"
        options={[
          { value: 'a', label: 'Apple' },
          { value: 'b', label: 'Banana' },
        ]}
        onSelect={onSelect}
      />
    )
    await user.click(screen.getByRole('button', { name: /Pick fruit/i }))
    await user.click(await screen.findByRole('option', { name: 'Banana' }))
    expect(onSelect).toHaveBeenCalledWith('b')
  })

  it('does not open when only one option', async () => {
    const user = userEvent.setup()
    const onSelect = jest.fn()
    render(
      <ScriptureModalToolbarMenu
        ariaLabel="Single"
        listboxAriaLabel="Only one"
        value="x"
        options={[{ value: 'x', label: 'Only' }]}
        onSelect={onSelect}
      />
    )
    await user.click(screen.getByRole('button', { name: /Single/i }))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onSelect).not.toHaveBeenCalled()
  })
})
