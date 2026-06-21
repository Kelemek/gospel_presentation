/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import PairingCodeInput from '@/components/PairingCodeInput'

function ControlledPairingCodeInput(props: {
  onComplete?: (value: string) => void
  disabled?: boolean
}) {
  const [value, setValue] = useState('')
  return (
    <PairingCodeInput
      value={value}
      onChange={setValue}
      onComplete={props.onComplete}
      disabled={props.disabled}
    />
  )
}

describe('PairingCodeInput', () => {
  it('sanitizes typed digits and calls onComplete at six characters', async () => {
    const onComplete = jest.fn()
    const user = userEvent.setup()

    render(<ControlledPairingCodeInput onComplete={onComplete} />)

    await user.type(screen.getByLabelText(/6-digit pairing code/i), '482910')

    expect(onComplete).toHaveBeenCalledWith('482910')
  })

  it('sanitizes pasted codes with spaces', async () => {
    const onComplete = jest.fn()
    const user = userEvent.setup()

    render(<ControlledPairingCodeInput onComplete={onComplete} />)

    const input = screen.getByLabelText(/6-digit pairing code/i)
    await user.click(input)
    await user.paste('12 34 56')

    expect(onComplete).toHaveBeenCalledWith('123456')
  })

  it('handles iOS autofill via input without change', () => {
    const onChange = jest.fn()
    const onComplete = jest.fn()

    render(<PairingCodeInput value="" onChange={onChange} onComplete={onComplete} />)

    const input = screen.getByLabelText(/6-digit pairing code/i)
    fireEvent.input(input, { target: { value: '998877' } })

    expect(onChange).toHaveBeenCalledWith('998877')
    expect(onComplete).toHaveBeenCalledWith('998877')
  })

  it('dedupes when input and change fire for the same autofill value', () => {
    const onChange = jest.fn()
    const onComplete = jest.fn()

    render(<PairingCodeInput value="" onChange={onChange} onComplete={onComplete} />)

    const input = screen.getByLabelText(/6-digit pairing code/i)
    fireEvent.input(input, { target: { value: '112233' } })
    fireEvent.change(input, { target: { value: '112233' } })

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('112233')
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('suppresses scrollIntoView on the input element', () => {
    render(<PairingCodeInput value="" onChange={jest.fn()} />)
    const input = screen.getByLabelText(/6-digit pairing code/i)
    expect(input.scrollIntoView()).toBeUndefined()
  })

  it('forwards change events from controlled value updates', () => {
    const onChange = jest.fn()
    const { rerender } = render(
      <PairingCodeInput value="" onChange={onChange} />
    )

    const input = screen.getByLabelText(/6-digit pairing code/i)
    fireEvent.change(input, { target: { value: '9' } })
    expect(onChange).toHaveBeenCalledWith('9')

    rerender(<PairingCodeInput value="9" onChange={onChange} />)
    expect(input).toHaveValue('9')
  })
})
