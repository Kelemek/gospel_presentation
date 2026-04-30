/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ScriptureModalPinPick from '../ScriptureModalPinPick'

describe('ScriptureModalPinPick', () => {
  test('opens listbox with tinted pin icons and reports choice', async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    render(
      <ScriptureModalPinPick
        reference="Gen 1:1"
        draftColor="yellow"
        onDraftColorChange={onChange}
        colorsAvailableInDropdown={['red', 'violet']}
        disabled={false}
      />
    )

    await user.click(screen.getByRole('button', { name: /^Pin color:/i }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /^violet pin$/i })).toBeInTheDocument()

    await user.click(screen.getByRole('option', { name: /^violet pin$/i }))
    expect(onChange).toHaveBeenCalledWith('violet')
  })
})
