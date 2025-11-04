import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Simplify AdminErrorBoundary for focused testing
jest.mock('@/components/AdminErrorBoundary', () => ({ __esModule: true, default: ({ children }: any) => <div>{children}</div> }))

// Provide a mock supabase client tailored for this test
jest.mock('@/lib/supabase/client', () => ({
  __esModule: true,
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    from: (table: string) => ({
      select: (_cols?: any) => ({
        // Support chaining .select(...).eq(...).single() used for checking role
        eq: (_col: string, _val: any) => ({ single: async () => ({ data: table === 'user_profiles' ? { role: 'admin' } : null, error: null }) }),
        // Support .select(...).order(...) used for loading profiles list
        order: (_col: string, _opts?: any) => ({ data: [
          { id: 'u-1', display_name: 'alice@example.com', role: 'admin', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        ], error: null })
      }),
      update: () => ({ eq: (_col: string, _val: any) => ({ error: null }) })
    })
  })
}))

beforeEach(() => {
  // Default fetch: return success for create user and users list endpoints
  // Tests override as needed.
  // Use a simple spy so we can assert calls if desired
  global.fetch = jest.fn((input: RequestInfo, opts?: any) => {
    const url = typeof input === 'string' ? input : (input as any).url || ''

    if (url.endsWith('/api/users/create')) {
      return Promise.resolve({ ok: true, json: async () => ({ id: 'new-u', email: 'new@example.com' }) } as any)
    }

    // Fallback: return empty successful response
    return Promise.resolve({ ok: true, json: async () => ({}) } as any)
  }) as any
})

afterEach(() => {
  jest.resetAllMocks()
})

test('UsersPage renders users list for admin', async () => {
  const { default: UsersPage } = await import('../page')

  render(<UsersPage />)

  // Header should be present (wait for async loads)
  await screen.findByText(/User Management/i)

  // Wait for the mocked users row to render
  await screen.findByText(/alice@example.com/i)
  expect(screen.queryByText(/No users found/i)).not.toBeInTheDocument()
})

test('UsersPage create new user modal and submit creates user', async () => {
  const { default: UsersPage } = await import('../page')
  render(<UsersPage />)

  // Wait for users list to render
  await screen.findByText(/alice@example.com/i)

  // Open new user modal
  await userEvent.click(await screen.findByRole('button', { name: /New User/i }))

  // Modal should show Create New User heading
  await screen.findByText(/Create New User/i)

  // Fill email and submit
  const emailInput = await screen.findByPlaceholderText('user@example.com')
  await userEvent.type(emailInput, 'new@example.com')

  // Submit form
  await userEvent.click(screen.getByRole('button', { name: /Create User/i }))

  // Wait for fetch to be called for create endpoint
  await waitFor(() => expect((global.fetch as jest.Mock).mock.calls.some(c => (typeof c[0] === 'string' && c[0].endsWith('/api/users/create')))).toBeTruthy())

  // Alert should have been called (jest.setup mocks global.alert)
  expect(global.alert).toHaveBeenCalled()
})
