import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import ComaModal from '../ComaModal'

describe('ComaModal', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it('fetches and renders instructions HTML when opened', async () => {
    const mockInstructions = '<h1>Guide</h1><ul><li>one</li></ul>'
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ template: { instructions: mockInstructions } })
    } as any)

    const onClose = jest.fn()
    render(<ComaModal isOpen={true} onClose={onClose} />)

    // Wait for the instructions to be displayed
    await waitFor(() => expect(screen.getByText('Guide')).toBeInTheDocument())
    expect(screen.getByText('one')).toBeInTheDocument()

  // Close button should call onClose - target the header close button
  // which has the label "Close modal" to avoid matching footer Close.
  fireEvent.click(screen.getByRole('button', { name: /close modal/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows fallback message when fetch fails', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network'))

    const onClose = jest.fn()
    render(<ComaModal isOpen={true} onClose={onClose} />)

    // Component sets fallback text 'Unable to load COMA instructions...' on error
    await waitFor(() => expect(screen.getByText(/Unable to load COMA instructions/i)).toBeInTheDocument())
  })
})
