import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import ApiStatus from '../ApiStatus'

describe('ApiStatus', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('shows loading state initially and then online when fetch ok', async () => {
    // mock a successful fetch
    // @ts-ignore global fetch mock
    global.fetch = jest.fn().mockResolvedValue({ ok: true })

    render(<ApiStatus />)

    // initial loading state
    expect(screen.getByText(/Checking.../i)).toBeInTheDocument()

    // after the effect resolves it should show online
    await waitFor(() => expect(screen.getByText(/ESV API: online/i)).toBeInTheDocument())
  })

  it('shows offline when fetch returns non-ok', async () => {
    // @ts-ignore
    global.fetch = jest.fn().mockResolvedValue({ ok: false })

    render(<ApiStatus />)

    expect(screen.getByText(/Checking.../i)).toBeInTheDocument()

    await waitFor(() => expect(screen.getByText(/ESV API: offline/i)).toBeInTheDocument())
  })

  it('shows offline when fetch throws', async () => {
    // @ts-ignore
    global.fetch = jest.fn().mockRejectedValue(new Error('network'))

    render(<ApiStatus />)

    expect(screen.getByText(/Checking.../i)).toBeInTheDocument()

    await waitFor(() => expect(screen.getByText(/ESV API: offline/i)).toBeInTheDocument())
  })
})
