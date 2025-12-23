import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock the supabase client createClient used by the page
const mockSignInWithOtp = jest.fn()
const mockSupabase = {
  auth: {
    signInWithOtp: mockSignInWithOtp
  }
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase
}))

import LoginPage from '../page'

describe('Login form flows', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('shows success state when verification code is sent', async () => {
    // check-user returns exists: true
    // @ts-expect-error mocking incompatible types
    global.fetch = jest.fn((url, opts) => {
      if (url === '/api/auth/check-user') {
        return Promise.resolve({ ok: true, json: async () => ({ exists: true }) })
      }
      if (url === '/api/auth/send-code') {
        return Promise.resolve({ ok: true, json: async () => ({ codeId: 'test-id', expiresAt: '2025-12-24' }) })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })

    const user = userEvent.setup()
    render(<LoginPage />)

    const input = await screen.findByLabelText(/Email Address/i)
    await user.type(input, 'test@example.com')

    const submit = screen.getByRole('button', { name: /Send Verification Code/i })
    await user.click(submit)

    // After successful code send, should move to code entry step
    await waitFor(() => expect(screen.getByText(/Verification code sent/i)).toBeInTheDocument())
  })

  it('shows an error when user does not exist', async () => {
    // check-user returns exists: false
    // @ts-expect-error mocking incompatible types
    global.fetch = jest.fn((url, opts) => {
      if (url === '/api/auth/check-user') {
        return Promise.resolve({ ok: true, json: async () => ({ exists: false }) })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })

    const user = userEvent.setup()
    render(<LoginPage />)

    const input = await screen.findByLabelText(/Email Address/i)
    await user.type(input, 'nope@example.com')

    const submit = screen.getByRole('button', { name: /Send Verification Code/i })
    await user.click(submit)

    await waitFor(() => expect(screen.getByText(/This email is not authorized/i)).toBeInTheDocument())
  })
})
