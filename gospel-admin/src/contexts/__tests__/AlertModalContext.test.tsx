'use client'

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Use real implementation for coverage
jest.unmock('@/contexts/AlertModalContext')
import { AlertModalProvider, useAlertModal } from '@/contexts/AlertModalContext'

function TestConsumer() {
  const { showAlert, showConfirm } = useAlertModal()
  return (
    <div>
      <button type="button" onClick={() => showAlert('Hello')}>Show alert</button>
      <button type="button" onClick={() => showConfirm('Confirm?')}>Show confirm</button>
    </div>
  )
}

describe('AlertModalContext', () => {
  it('throws when useAlertModal is used outside provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<TestConsumer />)).toThrow('useAlertModal must be used within AlertModalProvider')
    consoleSpy.mockRestore()
  })

  it('showAlert opens modal with message and OK closes it', async () => {
    const user = userEvent.setup({ delay: null })
    render(
      <AlertModalProvider>
        <TestConsumer />
      </AlertModalProvider>
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Show alert/i }))
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    expect(screen.getByText('Hello')).toBeInTheDocument()
    const okBtn = screen.getByRole('button', { name: 'OK' })
    expect(okBtn).toBeInTheDocument()
    expect(okBtn).toHaveAttribute('data-tour', 'alert-modal-ok')
    await user.click(okBtn)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('showConfirm opens modal with Cancel and Confirm', async () => {
    const user = userEvent.setup({ delay: null })
    render(
      <AlertModalProvider>
        <TestConsumer />
      </AlertModalProvider>
    )
    await user.click(screen.getByRole('button', { name: /Show confirm/i }))
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    expect(screen.getByText('Confirm?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    const confirmBtn = screen.getByRole('button', { name: 'Confirm' })
    expect(confirmBtn).toBeInTheDocument()
    expect(confirmBtn).toHaveAttribute('data-tour', 'alert-modal-confirm')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('showConfirm Confirm button resolves true', async () => {
    const user = userEvent.setup({ delay: null })
    let resolved: boolean | null = null
    function Consumer() {
      const { showConfirm } = useAlertModal()
      return (
        <button type="button" onClick={() => showConfirm('Sure?').then((v) => { resolved = v })}>
          Ask
        </button>
      )
    }
    render(
      <AlertModalProvider>
        <Consumer />
      </AlertModalProvider>
    )
    await user.click(screen.getByRole('button', { name: 'Ask' }))
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(resolved).toBe(true))
  })

  it('showConfirm Cancel resolves false', async () => {
    const user = userEvent.setup({ delay: null })
    let resolved: boolean | null = null
    function Consumer() {
      const { showConfirm } = useAlertModal()
      return (
        <button type="button" onClick={() => showConfirm('Sure?').then((v) => { resolved = v })}>
          Ask
        </button>
      )
    }
    render(
      <AlertModalProvider>
        <Consumer />
      </AlertModalProvider>
    )
    await user.click(screen.getByRole('button', { name: 'Ask' }))
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(resolved).toBe(false))
  })
})
