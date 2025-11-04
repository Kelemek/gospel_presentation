import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('@/components/AdminHeader', () => ({ __esModule: true, default: ({ title }: any) => <div data-testid="admin-header">{title}</div> }))
jest.mock('@/lib/supabase/client', () => ({
  __esModule: true,
  createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'admin@example.com' } } }) } })
}))

beforeAll(() => {
  global.fetch = jest.fn((input: RequestInfo) => {
    if (typeof input === 'string' && input.includes('/api/profiles/') && input.endsWith('/access')) {
      return Promise.resolve({ ok: true, json: async () => ({ access: [] }) } as any)
    }
    if (typeof input === 'string' && input.includes('/api/profiles/')) {
      return Promise.resolve({ ok: true, json: async () => ({ profile: { id: 'p1', title: 'P1', slug: 'p1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), visitCount: 0 } }) } as any)
    }
    return Promise.resolve({ ok: true, json: async () => ({}) } as any)
  }) as any
})

afterAll(() => {
  // @ts-ignore
  global.fetch = undefined
})

test('ProfileEditPage renders and loads profile data', async () => {
  const { ProfileEditPage } = await import('../page')

  render(<ProfileEditPage params={Promise.resolve({ slug: 'p1' })} />)

  await waitFor(() => expect(screen.getByTestId('admin-header')).toBeInTheDocument())
  expect(screen.getByText(/P1/i)).toBeInTheDocument()
})

test('ProfileEditPage saves profile and redirects on success', async () => {
  const { ProfileEditPage } = await import('../page')

  // Mock fetch to handle initial profile, access, and the save PUT
  // First call: /api/profiles/:slug -> return profile
  // Access calls: return empty list
  // PUT call: return ok
  global.fetch = jest.fn((input: RequestInfo, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : (input as any).url || ''
    if (url.includes('/api/profiles/') && url.endsWith('/access')) {
      return Promise.resolve({ ok: true, json: async () => ({ access: [] }) } as any)
    }
    if (init && init.method === 'PUT') {
      return Promise.resolve({ ok: true, json: async () => ({}) } as any)
    }
    if (url.includes('/api/profiles/')) {
      return Promise.resolve({ ok: true, json: async () => ({ profile: { id: 'p1', title: 'P1', slug: 'p1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), visitCount: 0 } }) } as any)
    }
    return Promise.resolve({ ok: true, json: async () => ({}) } as any)
  }) as any

  render(<ProfileEditPage params={Promise.resolve({ slug: 'p1' })} />)

  await waitFor(() => expect(screen.getByTestId('admin-header')).toBeInTheDocument())

  // Change the title and submit the form
  const titleInput = screen.getByLabelText(/Profile Title/i)
  await userEvent.clear(titleInput)
  await userEvent.type(titleInput, 'New Title')

  const saveButton = screen.getByRole('button', { name: /Save Changes|Save/i })
  await userEvent.click(saveButton)

  // Expect router push to /admin (jest.setup exposes __mockNextPush)
  await waitFor(() => expect((global as any).__mockNextPush).toHaveBeenCalledWith('/admin'))
})

test('ProfileEditPage adds a counselee and displays it in the access list', async () => {
  const { ProfileEditPage } = await import('../page')

  // Track POST to access and subsequent GET returning the new access entry
  let postCalled = false
  global.fetch = jest.fn((input: RequestInfo, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : (input as any).url || ''
    if (url.includes('/api/profiles/') && url.endsWith('/access')) {
      if (init && init.method === 'POST') {
        postCalled = true
        return Promise.resolve({ ok: true, json: async () => ({}) } as any)
      }
      // After adding, return one access entry
      return Promise.resolve({ ok: true, json: async () => ({ access: [{ id: 'a1', user_email: 'c@ex.com', created_at: new Date().toISOString(), user_id: null }] }) } as any)
    }
    if (url.includes('/api/profiles/')) {
      return Promise.resolve({ ok: true, json: async () => ({ profile: { id: 'p1', title: 'P1', slug: 'p1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), visitCount: 0 } }) } as any)
    }
    return Promise.resolve({ ok: true, json: async () => ({}) } as any)
  }) as any

  render(<ProfileEditPage params={Promise.resolve({ slug: 'p1' })} />)

  await waitFor(() => expect(screen.getByTestId('admin-header')).toBeInTheDocument())

  const emailInput = screen.getByPlaceholderText(/counselee@example.com/i)
  await userEvent.type(emailInput, 'c@ex.com')
  const addButton = screen.getByRole('button', { name: /Add Counselee/i })
  await userEvent.click(addButton)

  // Wait for fetch to be called and the new access entry to appear
  await waitFor(() => expect(postCalled).toBe(true))
  await waitFor(() => expect(screen.getByText(/c@ex.com/i)).toBeInTheDocument())
})
