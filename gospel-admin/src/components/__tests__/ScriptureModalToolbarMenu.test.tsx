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

  it('with portaledListbox, opens listbox in a portal and still calls onSelect', async () => {
    const user = userEvent.setup()
    const onSelect = jest.fn().mockResolvedValue(undefined)
    render(
      <div style={{ overflow: 'hidden', height: 80, width: 200 }}>
        <ScriptureModalToolbarMenu
          ariaLabel="Pick fruit"
          listboxAriaLabel="Fruits"
          value="a"
          portaledListbox
          options={[
            { value: 'a', label: 'Apple' },
            { value: 'b', label: 'Banana' },
          ]}
          onSelect={onSelect}
        />
      </div>
    )
    await user.click(screen.getByRole('button', { name: /Pick fruit/i }))
    const listbox = await screen.findByRole('listbox', { name: 'Fruits' })
    expect(listbox.parentElement).toBe(document.body)
    await user.click(screen.getByRole('option', { name: 'Banana' }))
    expect(onSelect).toHaveBeenCalledWith('b')
  })
})
